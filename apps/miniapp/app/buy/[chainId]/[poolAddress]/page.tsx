'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Address, isAddress, parseEther, getAddress } from 'viem'
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useConnect } from 'wagmi'
import { useIsMiniapp } from '@/hooks/useIsMiniapp'
import { usePoolData } from '@/hooks/usePoolData'
import { useBuyQuote } from '@/hooks/useBuyQuote'
import { useTokenData } from '@/hooks/useTokenData'
import { NFTSelector, ManualNFTInput } from '@/components/NFTSelector'
import { PriceQuote } from '@/components/PriceQuote'
import { TransactionStatus } from '@/components/TransactionStatus'
import { LSSVM_ROUTER_ABI, LSSVM_PAIR_ABI, LSSVM_FACTORY_ABI, ERC20_ABI, getRouterAddress, getFactoryAddress, CurveError } from '@/lib/contracts'
import { formatPrice } from '@/lib/pool'
import { getPublicClient } from '@/lib/wagmi'
import { base } from 'viem/chains'
import { useCart } from '@/hooks/useCart'
import { CartItem } from '@/contexts/CartContext'

function getChainFromId(chainId: string | string[]) {
  const id = typeof chainId === 'string' ? parseInt(chainId) : parseInt(chainId[0])
  if (isNaN(id)) {
    throw new Error(`Invalid chain ID: ${chainId}`)
  }
  if (id !== base.id) {
    throw new Error(`Unsupported chain: ${id}. Only Base Mainnet (${base.id}) is currently supported.`)
  }
  return base
}

export default function BuyPage() {
  const params = useParams()
  const router = useRouter()
  
  // DEBUG: Log everything we can about the current state
  useEffect(() => {
    if (typeof window !== 'undefined') {
      console.log('=== BUY PAGE DEBUG ===')
      console.log('Full params object:', params)
      console.log('params.chainId:', params.chainId, 'type:', typeof params.chainId)
      console.log('params.poolAddress:', params.poolAddress, 'type:', typeof params.poolAddress)
      console.log('window.location.href:', window.location.href)
      console.log('window.location.pathname:', window.location.pathname)
      console.log('window.location.search:', window.location.search)
      console.log('window.location.hash:', window.location.hash)
      console.log('sessionStorage.lastPoolData:', sessionStorage.getItem('lastPoolData'))
      console.log('========================')
    }
  }, [params])
  
  // Extract and normalize route parameters
  const chainIdParam = params.chainId
  const poolAddressParam = params.poolAddress
  
  // Handle Next.js params which can be string or string[]
  let chainId = Array.isArray(chainIdParam) ? chainIdParam[0] : chainIdParam
  let poolAddressRaw = Array.isArray(poolAddressParam) ? poolAddressParam[0] : poolAddressParam
  
  // Parse and validate chain ID (compute early but handle errors)
  let chain: typeof base | null = null
  try {
    if (chainId) {
      chain = getChainFromId(chainId)
    }
  } catch (error) {
    // Will handle in render
  }

  // Normalize and validate pool address (compute early but handle errors)
  let poolAddress: Address | undefined
  try {
    if (poolAddressRaw && isAddress(poolAddressRaw)) {
      poolAddress = getAddress(poolAddressRaw) // Normalize to checksummed address
    }
  } catch (error) {
    // Address is invalid, will handle in render
  }
  
  // ALL HOOKS MUST BE CALLED BEFORE ANY EARLY RETURNS
  // Fallback to sessionStorage if params are missing (for mini-app navigation issues)
  const [isCheckingFallback, setIsCheckingFallback] = useState(true)
  
  const { address: userAddress, isConnected, connector } = useAccount()
  const { connect, connectors, isPending: isConnecting } = useConnect()
  const isMiniapp = useIsMiniapp()
  const { items: cartItems, removeFromCart } = useCart()
  
  const [selectedNFTIds, setSelectedNFTIds] = useState<bigint[]>([])
  const [manualNFTIds, setManualNFTIds] = useState<bigint[]>([])
  const [slippageTolerance, setSlippageTolerance] = useState(5) // 5%
  const [erc1155Quantity, setErc1155Quantity] = useState(1)
  const [cartInitialized, setCartInitialized] = useState(false)

  const { data: poolData, isLoading: poolLoading, error: poolError } = usePoolData(
    poolAddress,
    chain?.id || 0
  )

  // Detect if this is an ERC1155 pool (runs when pool loads)
  const [isERC1155, setIsERC1155] = useState<boolean>(false)
  const [poolNftId, setPoolNftId] = useState<bigint | null>(null)
  const [isDetectingERC1155, setIsDetectingERC1155] = useState(false)

  // Initialize from cart data
  useEffect(() => {
    if (cartInitialized || !poolAddress || !chain) return

    // Try to load from localStorage first (from Cart component)
    let checkoutCartItems: CartItem[] = []
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('checkoutCart')
        if (stored) {
          const parsed = JSON.parse(stored)
          // Check if cart hasn't expired (24 hours)
          if (Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000) {
            checkoutCartItems = parsed.items.map((item: any) => ({
              ...item,
              nftId: BigInt(item.nftId),
            }))
          } else {
            localStorage.removeItem('checkoutCart')
          }
        }
      } catch (error) {
        console.error('Error loading checkout cart:', error)
      }
    }

    // Fallback to current cart items if no checkout cart
    const itemsToUse = checkoutCartItems.length > 0 
      ? checkoutCartItems 
      : cartItems.filter(item => 
          item.poolAddress.toLowerCase() === poolAddress.toLowerCase() &&
          item.chainId === chain.id
        )

    if (itemsToUse.length > 0) {
      // Filter items for this specific pool
      const poolItems = itemsToUse.filter(item =>
        item.poolAddress.toLowerCase() === poolAddress.toLowerCase() &&
        item.chainId === chain.id
      )

      if (poolItems.length > 0) {
        // Check if any are ERC1155
        const erc1155Item = poolItems.find(item => item.isERC1155)
        if (erc1155Item) {
          setErc1155Quantity(erc1155Item.quantity)
        } else {
          // ERC721 items
          const nftIds = poolItems.map(item => item.nftId)
          setSelectedNFTIds(nftIds)
          setManualNFTIds(nftIds)
        }
      }
    }

    setCartInitialized(true)
  }, [poolAddress, chain, cartItems, cartInitialized])

  useEffect(() => {
    if (!poolData?.address || !chain) return
    
    // TypeScript guard: chain is guaranteed to be non-null here
    const currentChain = chain

    const detectERC1155 = async () => {
      setIsDetectingERC1155(true)
      const client = getPublicClient(currentChain.id)
      
      // Method 1: Try calling nftId() - ERC1155 pairs have this, ERC721 pairs don't
      try {
        const nftId = await client.readContract({
          address: poolData.address,
          abi: LSSVM_PAIR_ABI,
          functionName: 'nftId',
        }) as bigint
        
        setIsERC1155(true)
        setPoolNftId(nftId)
        console.log('ERC1155 detected via nftId():', nftId.toString())
        setIsDetectingERC1155(false)
        return
      } catch (nftIdError) {
        console.log('nftId() call failed, trying pairVariant():', nftIdError)
      }
      
      // Method 2: Try pairVariant()
      try {
        const pairVariant = await client.readContract({
          address: poolData.address,
          abi: LSSVM_PAIR_ABI,
          functionName: 'pairVariant',
        }) as number
        
        console.log('Pair variant:', pairVariant)
        const is1155 = pairVariant === 2 || pairVariant === 3
        setIsERC1155(is1155)
        
        if (is1155) {
          // Try to get nftId
          try {
            const nftId = await client.readContract({
              address: poolData.address,
              abi: LSSVM_PAIR_ABI,
              functionName: 'nftId',
            }) as bigint
            setPoolNftId(nftId)
            console.log('Got pool nftId:', nftId.toString())
          } catch (err) {
            console.warn('Failed to get nftId:', err)
          }
        }
        
        console.log('Is ERC1155 (from pairVariant):', is1155)
        setIsDetectingERC1155(false)
        return
      } catch (variantError) {
        console.warn('Error calling pairVariant, trying factory.getPairNFTType():', variantError)
      }
      
      // Method 3: Try factory.getPairNFTType()
      try {
        const factoryAddress = getFactoryAddress(currentChain.id)
        const factoryNftType = await client.readContract({
          address: factoryAddress,
          abi: LSSVM_FACTORY_ABI,
          functionName: 'getPairNFTType',
          args: [poolData.address],
        }) as number
        
        const is1155 = factoryNftType === 1
        setIsERC1155(is1155)
        console.log('NFT type from factory:', factoryNftType, 'isERC1155:', is1155)
        
        if (is1155) {
          try {
            const nftId = await client.readContract({
              address: poolData.address,
              abi: LSSVM_PAIR_ABI,
              functionName: 'nftId',
            }) as bigint
            setPoolNftId(nftId)
            console.log('Got pool nftId:', nftId.toString())
          } catch (err) {
            console.error('Failed to get nftId even though factory says ERC1155:', err)
          }
        }
      } catch (factoryError) {
        console.warn('Error calling factory.getPairNFTType:', factoryError)
        setIsERC1155(false)
      }
      
      setIsDetectingERC1155(false)
    }

    detectERC1155()
  }, [poolData?.address, chain])

  const { data: tokenData } = useTokenData(
    poolData?.token,
    userAddress || undefined,
    chain?.id || 0
  )

  // For ERC1155: use pool's nftId and quantity from cart/state
  // For ERC721: use first selected NFT ID for quote, or first manual ID
  // Compute these early so they're available for hooks
  const quoteNFTId = isERC1155 && poolNftId !== null ? poolNftId : (selectedNFTIds[0] || manualNFTIds[0])
  const numItems = isERC1155 ? erc1155Quantity : (selectedNFTIds.length || manualNFTIds.length)

  const { data: buyQuote, isLoading: quoteLoading } = useBuyQuote(
    poolData?.address,
    quoteNFTId,
    numItems,
    chain?.id || 0
  )

  const {
    writeContract,
    data: hash,
    error: writeError,
    isPending: isWriting,
  } = useWriteContract()

  const {
    isLoading: isConfirming,
    isSuccess,
    error: txError,
  } = useWaitForTransactionReceipt({
    hash,
  })

  // Clear cart after successful purchase
  useEffect(() => {
    if (isSuccess && typeof window !== 'undefined' && poolAddress && chain) {
      // Clear checkout cart
      localStorage.removeItem('checkoutCart')
      // Remove items from main cart for this pool
      cartItems
        .filter(item =>
          item.poolAddress.toLowerCase() === poolAddress.toLowerCase() &&
          item.chainId === chain.id
        )
        .forEach(item => {
          removeFromCart(item.poolAddress, item.nftId)
        })
    }
  }, [isSuccess, cartItems, poolAddress, chain, removeFromCart])

  // ERC20 approval - use the same writeContract hook but track approval state separately
  const [isApprovalMode, setIsApprovalMode] = useState(false)
  const [approvalParams, setApprovalParams] = useState<{
    address: Address
    args: [Address, bigint]
  } | null>(null)
  
  // Use the same writeContract hook for both approval and buy
  // We'll track which operation we're doing with state
  const approvalHash = isApprovalMode ? hash : undefined
  const isApproving = isApprovalMode ? isWriting : false
  const approvalError = isApprovalMode ? writeError : undefined

  const {
    isLoading: isApprovalConfirming,
    isSuccess: isApprovalSuccess,
    error: approvalTxError,
  } = useWaitForTransactionReceipt({
    hash: approvalHash,
  })
  
  // Monitor approval errors and handle getProvider fallback
  const [shouldUseSDKFallback, setShouldUseSDKFallback] = useState(false)
  
  useEffect(() => {
    if (approvalError) {
      console.error('Approval error detected:', approvalError)
      const errorObj = approvalError as any
      const errorMessage = String(errorObj?.message || errorObj?.shortMessage || approvalError)
      
      // If it's the getProvider error, set flag to use SDK fallback
      if (errorMessage.includes('getProvider') || errorMessage.includes('getProvider is not a function')) {
        console.log('getProvider error detected, will use Farcaster SDK fallback')
        setShouldUseSDKFallback(true)
      }
    }
    if (approvalTxError) {
      console.error('Approval transaction error:', approvalTxError)
    }
  }, [approvalError, approvalTxError])
  
  // Handle SDK fallback when getProvider error is detected
  useEffect(() => {
    if (shouldUseSDKFallback && isApprovalMode && approvalParams && userAddress) {
      const sendApprovalViaSDK = async () => {
        try {
          console.log('Using Farcaster SDK provider directly for approval...')
          
          // Use Farcaster SDK's Ethereum provider directly
          const { sdk } = await import('@farcaster/miniapp-sdk')
          const provider = await sdk.wallet.getEthereumProvider()
          
          if (!provider) {
            throw new Error('Failed to get Ethereum provider from Farcaster SDK')
          }
          
          // Create a wallet client from the provider
          const { createWalletClient, custom } = await import('viem')
          const walletClient = createWalletClient({
            chain: base,
            transport: custom(provider),
          })
          
          // Send the approval transaction
          const txHash = await walletClient.writeContract({
            address: approvalParams.address,
            abi: ERC20_ABI,
            functionName: 'approve',
            args: approvalParams.args,
            account: userAddress as Address,
          })
          
          console.log('Approval transaction sent via Farcaster SDK:', txHash)
          
          // Store the hash so we can track it
          // Note: We can't directly set the wagmi hash, so we'll need to track it separately
          // For now, alert and reset state
          alert(`Approval transaction sent! Hash: ${txHash.slice(0, 10)}... Please wait for it to confirm, then click Buy again.`)
          
          setIsApprovalMode(false)
          setApprovalParams(null)
          setShouldUseSDKFallback(false)
        } catch (sdkError: any) {
          console.error('Error using Farcaster SDK provider:', sdkError)
          setIsApprovalMode(false)
          setApprovalParams(null)
          setShouldUseSDKFallback(false)
          alert(`Failed to send approval via Farcaster SDK: ${sdkError?.message || 'Unknown error'}. Please try again.`)
        }
      }
      
      sendApprovalViaSDK()
    }
  }, [shouldUseSDKFallback, isApprovalMode, approvalParams, userAddress])
  
  // ETH pair if token is zero address (ETH pairs don't have token() function)
  const isETH = poolData?.token === '0x0000000000000000000000000000000000000000'
  // For ERC1155: we always have a selection (quantity = 1, using pool's nftId)
  // For ERC721: require user to select/enter NFT IDs
  const hasSelection = isERC1155 ? (poolNftId !== null && !isDetectingERC1155) : (selectedNFTIds.length > 0 || manualNFTIds.length > 0)
  const canBuy =
    userAddress && // User must be connected
    hasSelection &&
    buyQuote &&
    buyQuote.error === CurveError.OK &&
    !isWriting &&
    !isConfirming
  
  // Auto-connect to Farcaster wallet when in mini-app context
  useEffect(() => {
    if (isMiniapp && !userAddress && connectors.length > 0) {
      // Find Farcaster connector - ID is 'farcaster'
      const farcasterConnector = connectors.find(
        c => c.id === 'farcaster' || c.name?.toLowerCase().includes('farcaster')
      )
      if (farcasterConnector) {
        console.log('Auto-connecting to Farcaster wallet:', farcasterConnector.id)
        connect({ connector: farcasterConnector })
      } else {
        console.log('Available connectors:', connectors.map(c => ({ id: c.id, name: c.name })))
      }
    }
  }, [isMiniapp, userAddress, connectors, connect])
  
  // Fallback to sessionStorage if params are missing (for mini-app navigation issues)
  useEffect(() => {
    if ((!chainId || !poolAddressRaw) && typeof window !== 'undefined') {
      console.log('Params missing, checking sessionStorage fallback...')
      console.log('chainId:', chainId, 'poolAddressRaw:', poolAddressRaw)
      try {
        const stored = sessionStorage.getItem('lastPoolData')
        console.log('Stored data:', stored)
        if (stored) {
          const { chainId: storedChainId, poolAddress: storedPoolAddress } = JSON.parse(stored)
          console.log('Parsed stored data:', { storedChainId, storedPoolAddress })
          if (storedChainId && storedPoolAddress) {
            console.log('Redirecting to:', `/buy/${storedChainId}/${storedPoolAddress}`)
            // Redirect to the correct URL with the stored params
            router.replace(`/buy/${storedChainId}/${storedPoolAddress}`)
            return
          }
        }
      } catch (error) {
        console.error('Error reading sessionStorage:', error)
      }
    }
    setIsCheckingFallback(false)
  }, [chainId, poolAddressRaw, router])
  
  // Debug logging for button state
  useEffect(() => {
    if (typeof window !== 'undefined') {
      console.log('=== Buy Button Debug ===')
      console.log('userAddress:', userAddress)
      console.log('hasSelection:', hasSelection)
      console.log('isERC1155:', isERC1155)
      console.log('poolNftId:', poolNftId?.toString() || 'null')
      console.log('isDetectingERC1155:', isDetectingERC1155)
      console.log('selectedNFTIds:', selectedNFTIds.map(id => id.toString()))
      console.log('manualNFTIds:', manualNFTIds.map(id => id.toString()))
      console.log('buyQuote:', buyQuote ? { error: buyQuote.error, inputAmount: buyQuote.inputAmount?.toString() } : 'null')
      console.log('isWriting:', isWriting)
      console.log('isConfirming:', isConfirming)
      console.log('canBuy:', canBuy)
      console.log('========================')
    }
  }, [userAddress, hasSelection, isERC1155, poolNftId, isDetectingERC1155, selectedNFTIds, manualNFTIds, buyQuote, isWriting, isConfirming, canBuy])
  
  // Show loading while checking fallback
  if (isCheckingFallback && (!chainId || !poolAddressRaw)) {
    return (
      <main className="min-h-screen p-4">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span>Loading...</span>
          </div>
        </div>
      </main>
    )
  }
  
  // Check if required params are missing
  if (!chainId || !poolAddressRaw) {
    return (
      <main className="min-h-screen p-4">
        <div className="max-w-2xl mx-auto">
          <div className="border rounded-lg p-4 bg-red-50">
            <div className="text-red-600 font-semibold mb-2">Missing Route Parameters</div>
            <div className="text-sm text-red-500">
              {!chainId && !poolAddressRaw 
                ? 'Both chain ID and pool address are missing. Please navigate from a pool page or provide them in the URL.'
                : !chainId 
                  ? 'Chain ID is missing. Please navigate from a pool page or provide it in the URL.'
                  : 'Pool address is missing. Please navigate from a pool page or provide it in the URL.'}
            </div>
            <div className="text-xs text-gray-500 mt-2 space-y-1">
              <div>URL params: chainId={chainId || 'none'}, poolAddress={poolAddressRaw || 'none'}</div>
              <div>Raw params.chainId: {String(chainIdParam || 'undefined')} (type: {typeof chainIdParam})</div>
              <div>Raw params.poolAddress: {String(poolAddressParam || 'undefined')} (type: {typeof poolAddressParam})</div>
              {typeof window !== 'undefined' && (
                <>
                  <div>window.location.href: {window.location.href}</div>
                  <div>window.location.pathname: {window.location.pathname}</div>
                  <div>sessionStorage: {sessionStorage.getItem('lastPoolData') || 'empty'}</div>
                </>
              )}
            </div>
          </div>
        </div>
      </main>
    )
  }
  
  // Parse and validate chain ID
  if (!chain) {
    try {
      chain = getChainFromId(chainId)
    } catch (error) {
      return (
        <main className="min-h-screen p-4">
          <div className="max-w-2xl mx-auto">
            <div className="border rounded-lg p-4 bg-red-50">
              <div className="text-red-600 font-semibold mb-2">Invalid Chain ID</div>
              <div className="text-sm text-red-500">
                {error instanceof Error ? error.message : 'Invalid chain ID provided'}
              </div>
              <div className="text-xs text-gray-500 mt-2">Chain ID: {chainId}</div>
            </div>
          </div>
        </main>
      )
    }
  }

  const handleBuy = async () => {
    if (!poolData || !userAddress || !buyQuote) {
      console.error('Cannot buy:', { poolData: !!poolData, userAddress, buyQuote })
      return
    }
    
    if (buyQuote.error !== CurveError.OK) {
      alert(`Cannot buy: Quote error ${buyQuote.error}. Please check the NFT IDs and try again.`)
      return
    }

    // Use the detected ERC1155 state (detected when pool loads)
    console.log('Using detected ERC1155 state:', { isERC1155, poolNftId: poolNftId?.toString() })

    const client = getPublicClient(chain.id)
    
    // For ERC1155: use quantity from state
    // For ERC721: require at least one NFT selected
    if (isERC1155) {
      if (poolNftId === null) {
        alert('Error: Could not determine NFT ID for ERC1155 pool. Please try again.')
        return
      }
      if (erc1155Quantity <= 0) {
        alert('Please select a quantity greater than 0')
        return
      }
    } else {
      const nftIds = selectedNFTIds.length > 0 ? selectedNFTIds : manualNFTIds
      if (nftIds.length === 0) {
        alert('Please select at least one NFT')
        return
      }
    }

    // For ERC1155: use pool's nftId and quantity from state
    // For ERC721: use nftIds[0] as assetId and nftIds.length as quantity
    const nftIds = isERC1155 ? [] : (selectedNFTIds.length > 0 ? selectedNFTIds : manualNFTIds)
    const assetId = isERC1155 && poolNftId !== null ? poolNftId : (nftIds.length > 0 ? BigInt(nftIds[0]) : BigInt(0))
    const quantity = isERC1155 ? BigInt(erc1155Quantity) : BigInt(nftIds.length)

    console.log('Buy parameters:', {
      isERC1155,
      assetId: assetId.toString(),
      quantity: quantity.toString(),
      userInputNftIds: nftIds.map(id => id.toString()),
      poolNftId: poolNftId?.toString(),
    })

    // Get a fresh quote with the correct parameters
    try {
      const freshQuote = await client.readContract({
        address: poolData.address,
        abi: LSSVM_PAIR_ABI,
        functionName: 'getBuyNFTQuote',
        args: [assetId, quantity],
      })

      const quoteError = freshQuote[0] as CurveError
      if (quoteError !== CurveError.OK) {
        const errorMsg = isERC1155 
          ? `Cannot buy ${quantity} copies: Quote error ${quoteError}. The pool may not have enough liquidity.`
          : `Cannot buy NFT ID ${nftIds[0]}: Quote error ${quoteError}. This NFT may not be available or the pool may not have enough liquidity.`
        alert(errorMsg)
        return
      }

      const freshInputAmount = freshQuote[3] as bigint
      const freshProtocolFee = freshQuote[4] as bigint
      const freshRoyaltyAmount = freshQuote[5] as bigint
      const totalCost = freshInputAmount + freshProtocolFee + freshRoyaltyAmount
      
      console.log('Fresh quote details:', {
        error: quoteError,
        inputAmount: freshInputAmount.toString(),
        protocolFee: freshProtocolFee.toString(),
        royaltyAmount: freshRoyaltyAmount.toString(),
        totalCost: totalCost.toString(),
      })

      // Calculate max cost with slippage using fresh quote
      // Note: We use inputAmount (which already includes fees) and add slippage
      const maxCost = (freshInputAmount * BigInt(100 + slippageTolerance)) / BigInt(100)
      const routerAddress = getRouterAddress(chain.id)
      const factoryAddress = getFactoryAddress(chain.id)

      console.log('Cost calculation:', {
        freshInputAmount: freshInputAmount.toString(),
        slippageTolerance,
        maxCost: maxCost.toString(),
        totalCostWithSlippage: (totalCost * BigInt(100 + slippageTolerance)) / BigInt(100),
      })

      // Check if router is whitelisted
      const routerStatus = await client.readContract({
        address: factoryAddress,
        abi: LSSVM_FACTORY_ABI,
        functionName: 'routerStatus',
        args: [routerAddress],
      })

      console.log('Router status:', {
        routerAddress,
        factoryAddress,
        allowed: routerStatus[0],
        wasEverTouched: routerStatus[1],
      })

      if (!routerStatus[0]) {
        alert(`Router ${routerAddress} is not whitelisted in the factory. Please contact the protocol admin to whitelist this router.`)
        console.error('Router not whitelisted:', { routerAddress, factoryAddress, routerStatus })
        return
      }

      // Verify the router will get a valid quote
      // The router will call getBuyNFTQuote again, so let's verify it's still valid
      const routerQuote = await client.readContract({
        address: poolData.address,
        abi: LSSVM_PAIR_ABI,
        functionName: 'getBuyNFTQuote',
        args: [assetId, quantity],
      })

      const routerQuoteError = routerQuote[0] as CurveError
      const routerQuoteInputAmount = routerQuote[3] as bigint // This already includes everything
      const routerQuoteProtocolFee = routerQuote[4] as bigint // Just for logging
      const routerQuoteRoyaltyAmount = routerQuote[5] as bigint // Just for logging

      console.log('Router quote (what router will see):', {
        error: routerQuoteError,
        inputAmount: routerQuoteInputAmount.toString(),
        protocolFee: routerQuoteProtocolFee.toString(),
        royaltyAmount: routerQuoteRoyaltyAmount.toString(),
        note: 'inputAmount already includes protocolFee and royaltyAmount',
      })

      if (routerQuoteError !== CurveError.OK) {
        alert(`Router quote failed with error ${routerQuoteError}. The pool state may have changed. Please try again.`)
        return
      }

      // Use routerQuoteInputAmount directly (it already includes all fees and royalties)
      // Add reasonable slippage tolerance (5%)
      const baseCost = routerQuoteInputAmount
      const finalMaxCost = (baseCost * BigInt(100 + slippageTolerance)) / BigInt(100)
      
      console.log('Final cost calculation:', {
        routerQuoteInputAmount: routerQuoteInputAmount.toString(),
        slippageTolerance,
        finalMaxCost: finalMaxCost.toString(),
        note: 'inputAmount already includes all fees and royalties, only adding slippage',
      })

      // Check if ETH pair (token is zero address) or ERC20 pair
      const isETHPair = poolData.token === '0x0000000000000000000000000000000000000000'

      if (isETHPair) {
        if (isERC1155 && poolNftId !== null) {
          // For ERC1155: Try using the router despite interface mismatch
          // The router calls: getBuyNFTQuote(nftIds[0], nftIds.length)
          // Then calls: swapTokenForSpecificNFTs(nftIds, ...)
          // 
          // For ERC1155 pairs:
          // - getBuyNFTQuote expects: (nftId, quantity) - so nftIds[0] = poolNftId, nftIds.length = quantity
          // - swapTokenForSpecificNFTs expects: numNFTs[0] = quantity, numNFTs.length = 1
          //
          // These are incompatible! But let's try anyway - maybe the router has special handling?
          // We'll pass [poolNftId] repeated `quantity` times
          // Router will call getBuyNFTQuote(poolNftId, quantity) ✓
          // Router will call swapTokenForSpecificNFTs([poolNftId, poolNftId, ...], ...) ✗ (pair expects [quantity])
          //
          // Actually, wait - let me check if the router can work. The router passes nftIds directly
          // to the pair, but the pair expects numNFTs[0] = quantity. So this won't work.
          //
          // Let's try calling the pair directly but with isRouter=true to see if that helps
          // with ETH transfers. The pair will verify the router is whitelisted.
          // But we're not calling through the router, so isRouter should be false.
          //
          // Actually, the real issue is ETH_TRANSFER_FAILED. This happens in _pullTokenInputs
          // when the pair tries to transfer ETH to royalty/fee recipients. Farcaster wallets
          // might not handle these transfers correctly.
          //
          // Let's try calling through the router anyway - maybe it handles ETH transfers better?
          // We'll construct nftIds as [poolNftId] repeated quantity times
          const routerNftIds = Array(Number(erc1155Quantity)).fill(poolNftId).map(id => BigInt(id))
          
          console.log('Attempting to use router for ERC1155 (may fail due to interface mismatch):', {
            routerAddress,
            pair: poolData.address,
            routerNftIds: routerNftIds.map(id => id.toString()),
            quantity: quantity.toString(),
            poolNftId: poolNftId.toString(),
            note: 'Router expects nftIds array, but pair expects numNFTs[0]=quantity. This may fail.',
          })

          const swapArgs = [
            [
              {
                pair: poolData.address,
                nftIds: routerNftIds,
              },
            ],
            userAddress, // ethRecipient
            userAddress, // nftRecipient
            BigInt(Math.floor(Date.now() / 1000) + 3600), // 1 hour deadline
          ] as const

          try {
            writeContract({
              address: routerAddress,
              abi: LSSVM_ROUTER_ABI,
              functionName: 'swapETHForSpecificNFTs',
              args: swapArgs,
              value: finalMaxCost,
            })
          } catch (routerErr: any) {
            console.warn('Router call failed, trying direct pair call:', routerErr)
            
            // Fallback: Call pair directly
            // The pair will transfer ETH to royalty/fee recipients, which might fail in Farcaster wallets
            const pairSwapArgs = [
              [BigInt(erc1155Quantity)], // numNFTs array: [quantity]
              finalMaxCost, // maxExpectedTokenInput
              userAddress, // nftRecipient
              false, // isRouter (we're calling directly)
              '0x0000000000000000000000000000000000000000' as Address, // routerCaller (not used for ETH pairs)
            ] as const

            console.log('Falling back to direct pair call:', {
              pair: poolData.address,
              numNFTs: [erc1155Quantity.toString()],
              maxExpectedTokenInput: finalMaxCost.toString(),
              msgValue: finalMaxCost.toString(),
              note: 'Direct pair call. ETH transfers to royalties/fees might fail in Farcaster wallets.',
            })

            try {
              writeContract({
                address: poolData.address,
                abi: LSSVM_PAIR_ABI,
                functionName: 'swapTokenForSpecificNFTs',
                args: pairSwapArgs,
                value: finalMaxCost,
              })
            } catch (pairErr: any) {
              console.error('Both router and direct pair call failed:', pairErr)
              const errorMsg = pairErr?.message || 'Unknown error'
              if (errorMsg.includes('ETH_TRANSFER_FAILED')) {
                alert(`Transaction failed: ETH transfer error. This is a known limitation when calling ERC1155 pairs directly from Farcaster wallets. The pair needs to transfer ETH to royalty/fee recipients, which may not be supported.`)
              } else {
                alert(`Transaction failed: ${errorMsg}. Please check the console for details.`)
              }
            }
          }
        } else {
          // For ERC721: Use the router
          const routerNftIds = nftIds.map(id => BigInt(id))
          
          const swapArgs = [
            [
              {
                pair: poolData.address,
                nftIds: routerNftIds,
              },
            ],
            userAddress, // ethRecipient
            userAddress, // nftRecipient
            BigInt(Math.floor(Date.now() / 1000) + 3600), // 1 hour deadline
          ] as const

          console.log('Executing swapETHForSpecificNFTs via router:', {
            routerAddress,
            pair: poolData.address,
            routerNftIds: routerNftIds.map(id => id.toString()),
            msgValue: finalMaxCost.toString(),
            routerQuoteTotal: routerQuoteInputAmount.toString(),
            ethRecipient: userAddress,
            nftRecipient: userAddress,
            note: 'ERC721: Router uses nftIds array with specific NFT IDs to buy',
          })

          try {
            writeContract({
              address: routerAddress,
              abi: LSSVM_ROUTER_ABI,
              functionName: 'swapETHForSpecificNFTs',
              args: swapArgs,
              value: finalMaxCost,
            })
          } catch (err: any) {
            console.error('Error calling writeContract on router:', err)
            alert(`Transaction failed: ${err?.message || 'Unknown error'}. Please check the console for details.`)
          }
        }
      } else {
        // ERC20 pool - use ERC20 swap
        // For ERC20, we need to approve tokens
        // For ERC721: approve the router (router calls the pair)
        // For ERC1155: approve the pair directly (we call the pair directly, bypassing router)
        const erc20InputAmount = finalMaxCost
        const tokenAddress = poolData.token as Address
        const approvalTarget = (isERC1155 && poolNftId !== null) ? poolData.address : routerAddress
        
        // Check current allowance
        const currentAllowance = await client.readContract({
          address: tokenAddress,
          abi: ERC20_ABI,
          functionName: 'allowance',
          args: [userAddress, approvalTarget],
        }) as bigint

        console.log('ERC20 allowance check:', {
          tokenAddress,
          userAddress,
          approvalTarget,
          isERC1155,
          note: isERC1155 ? 'ERC1155: approving pair directly' : 'ERC721: approving router',
          currentAllowance: currentAllowance.toString(),
          requiredAmount: erc20InputAmount.toString(),
          needsApproval: currentAllowance < erc20InputAmount,
        })

        // If allowance is insufficient, approve first
        if (currentAllowance < erc20InputAmount) {
          console.log('Approving ERC20 tokens for router...')
          
          // Verify wallet is connected
          if (!isConnected || !userAddress) {
            alert('Wallet is not connected. Please connect your wallet and try again.')
            return
          }
          
          console.log('Wallet connection status:', { isConnected, userAddress, connector: connector?.name })
          
          // Check if there's already a pending approval
          if (isApproving || isApprovalConfirming || approvalHash) {
            console.log('Approval already in progress:', { isApproving, isApprovalConfirming, approvalHash })
            alert('Approval transaction is already in progress. Please wait for it to complete, then click Buy again.')
            return
          }
          
          // Check for previous approval errors
          if (approvalError) {
            console.error('Previous approval error:', approvalError)
            const errorObj = approvalError as any
            const errorMessage = errorObj?.message || errorObj?.shortMessage || String(approvalError) || 'Unknown error'
            alert(`Previous approval failed: ${errorMessage}. Please try again.`)
            return
          }
          
          try {
            // Approve a bit more than needed to avoid needing re-approval for small price changes
            const approvalAmount = erc20InputAmount * BigInt(2) // Approve 2x to have buffer
            
            console.log('Calling writeContractApproval with:', {
              address: tokenAddress,
              functionName: 'approve',
              args: [approvalTarget, approvalAmount.toString()],
              userAddress,
              chainId: chain.id,
              approvalTarget,
              note: isERC1155 ? 'ERC1155: approving pair directly' : 'ERC721: approving router',
            })
            
            // Try using wagmi's writeContract first
            // If it fails with getProvider error, fall back to Farcaster SDK provider
            setIsApprovalMode(true)
            setApprovalParams({
              address: tokenAddress,
              args: [approvalTarget, approvalAmount],
            })
            
            try {
              // Reset SDK fallback flag
              setShouldUseSDKFallback(false)
              
              // Try using wagmi's writeContract
              // If it fails with getProvider error, the useEffect will handle the fallback
              writeContract({
                address: tokenAddress,
                abi: ERC20_ABI,
                functionName: 'approve',
                args: [approvalTarget, approvalAmount],
              })
              
              // Wait a short moment to see if an error occurs or hash is set
              await new Promise(resolve => setTimeout(resolve, 500))
              
              // If SDK fallback was triggered, it will handle everything
              if (shouldUseSDKFallback) {
                // The useEffect will handle the SDK fallback
                return
              }
              
              // Check if an error occurred
              if (writeError) {
                const errorObj = writeError as any
                const errorMessage = errorObj?.message || errorObj?.shortMessage || String(writeError) || 'Unknown error'
                console.error('Approval error after calling writeContract:', writeError)
                setIsApprovalMode(false)
                setApprovalParams(null)
                alert(`Failed to initiate approval: ${errorMessage}. Please check your wallet and try again.`)
                return
              }
              
              // Check if transaction hash was set (transaction was initiated)
              if (!hash && !isWriting) {
                console.warn('No approval hash set and not pending - transaction may not have been initiated')
                setIsApprovalMode(false)
                setApprovalParams(null)
                alert('Failed to initiate approval transaction. Please check your wallet connection and try again.')
                return
              }
              
              // Transaction was initiated successfully
              console.log('Approval transaction initiated:', { hash, isWriting })
              
              // Wait for approval to confirm before proceeding
              // The user will need to click buy again after approval confirms
              alert('Please approve the ERC20 token spending in your wallet. Once approved, click Buy again.')
              return
            } catch (err: any) {
              setIsApprovalMode(false)
              setApprovalParams(null)
              throw err
            }
          } catch (err: any) {
            console.error('Error approving ERC20 tokens:', err)
            const errorMessage = err?.message || err?.shortMessage || 'Unknown error'
            alert(`Failed to approve tokens: ${errorMessage}. Please check the console for details.`)
            return
          }
        }

        // If we just approved, wait for it to confirm
        if (isApprovalMode && approvalHash && !isApprovalSuccess && (isApprovalConfirming || isApproving)) {
          alert('Waiting for approval to confirm... Please try again once the approval transaction confirms.')
          return
        }
        
        // Reset approval mode if approval succeeded
        if (isApprovalMode && isApprovalSuccess) {
          setIsApprovalMode(false)
          setApprovalParams(null)
        }
        
        // For ERC1155 pairs, call the pair directly instead of using the router
        // The router's quote validation doesn't work correctly for ERC1155 because it uses
        // nftIds[0] as the assetId, but for ERC1155 the assetId should be the pair's nftId()
        if (isERC1155 && poolNftId !== null) {
          console.log('Calling ERC1155 pair directly (bypassing router):', {
            pair: poolData.address,
            numNFTs: [quantity.toString()],
            maxExpectedTokenInput: erc20InputAmount.toString(),
            nftRecipient: userAddress,
            isRouter: false,
            routerCaller: '0x0000000000000000000000000000000000000000',
          })

          // For ERC1155, call swapTokenForSpecificNFTs directly on the pair
          // numNFTs[0] = quantity
          const pairSwapArgs = [
            [BigInt(erc1155Quantity)], // numNFTs array: [quantity]
            erc20InputAmount, // maxExpectedTokenInput
            userAddress, // nftRecipient
            false, // isRouter (we're calling directly)
            '0x0000000000000000000000000000000000000000' as Address, // routerCaller (not used when isRouter=false)
          ] as const

          // Simulate first
          try {
            console.log('Simulating direct pair call...')
            await client.simulateContract({
              address: poolData.address,
              abi: LSSVM_PAIR_ABI,
              functionName: 'swapTokenForSpecificNFTs',
              args: pairSwapArgs,
              account: userAddress,
            })
            console.log('Simulation successful, sending transaction...')
          } catch (simErr: any) {
            console.error('Transaction simulation failed:', simErr)
            const errorMessage = simErr?.message || simErr?.shortMessage || String(simErr) || 'Unknown error'
            alert(`Transaction would fail: ${errorMessage}. Please check the console for details.`)
            return
          }

          // Call the pair directly
          try {
            writeContract({
              address: poolData.address,
              abi: LSSVM_PAIR_ABI,
              functionName: 'swapTokenForSpecificNFTs',
              args: pairSwapArgs,
            })
          } catch (err: any) {
            console.error('Error calling writeContract on pair:', err)
            alert(`Transaction failed: ${err?.message || 'Unknown error'}. Please check the console for details.`)
          }
        } else {
          // For ERC721, use the router as normal
          const routerNftIds = nftIds.map(id => BigInt(id))
          
          const swapArgs = [
            [
              {
                pair: poolData.address,
                nftIds: routerNftIds,
              },
            ],
            erc20InputAmount,
            userAddress,
            BigInt(Math.floor(Date.now() / 1000) + 3600), // 1 hour deadline
          ] as const

          console.log('Executing swapERC20ForSpecificNFTs via router:', {
            routerAddress,
            pair: poolData.address,
            routerNftIds: routerNftIds.map(id => id.toString()),
            inputAmount: erc20InputAmount.toString(),
            routerQuoteTotal: routerQuoteInputAmount.toString(),
            nftRecipient: userAddress,
            currentAllowance: currentAllowance.toString(),
          })

          // Simulate the transaction first to catch any errors
          try {
            console.log('Simulating transaction...')
            await client.simulateContract({
              address: routerAddress,
              abi: LSSVM_ROUTER_ABI,
              functionName: 'swapERC20ForSpecificNFTs',
              args: swapArgs,
              account: userAddress,
            })
            console.log('Simulation successful, sending transaction...')
          } catch (simErr: any) {
            console.error('Transaction simulation failed:', simErr)
            const errorMessage = simErr?.message || simErr?.shortMessage || String(simErr) || 'Unknown error'
            alert(`Transaction would fail: ${errorMessage}. Please check the console for details.`)
            return
          }

          // Call writeContract directly - wagmi will handle the transaction
          // Wrap in try-catch to handle errors gracefully
          try {
            writeContract({
              address: routerAddress,
              abi: LSSVM_ROUTER_ABI,
              functionName: 'swapERC20ForSpecificNFTs',
              args: swapArgs,
            })
          } catch (err: any) {
            console.error('Error calling writeContract:', err)
            alert(`Transaction failed: ${err?.message || 'Unknown error'}. Please check the console for details.`)
          }
        }
      }
    } catch (error) {
      console.error('Error preparing transaction:', error)
      alert(`Failed to prepare transaction: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Validate address format
  if (!poolAddress) {
    console.log('=== ADDRESS VALIDATION FAILED ===')
    console.log('poolAddressRaw:', poolAddressRaw, 'type:', typeof poolAddressRaw)
    console.log('isAddress check:', isAddress(poolAddressRaw || ''))
    console.log('==================================')
    
    return (
      <main className="min-h-screen p-4">
        <div className="max-w-2xl mx-auto">
          <div className="border rounded-lg p-4 bg-red-50">
            <div className="text-red-600 font-semibold mb-2">Invalid Pool Address</div>
            <div className="text-sm text-red-500">The pool address "{poolAddressRaw}" is not a valid Ethereum address.</div>
            <div className="text-xs text-gray-500 mt-2 space-y-1">
              <div>Received: {poolAddressRaw || 'undefined'}</div>
              <div>Type: {typeof poolAddressRaw}</div>
              <div>Length: {poolAddressRaw?.length || 0}</div>
              <div>isAddress check: {String(isAddress(poolAddressRaw || ''))}</div>
              {typeof window !== 'undefined' && (
                <>
                  <div>Full URL: {window.location.href}</div>
                  <div>Pathname: {window.location.pathname}</div>
                  <div>Params object: {JSON.stringify(params)}</div>
                </>
              )}
            </div>
          </div>
        </div>
      </main>
    )
  }

  if (poolLoading) {
    return (
      <main className="min-h-screen bg-gray-50 py-6 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white border border-gray-200 rounded-xl p-8 flex flex-col items-center justify-center gap-4">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div>
            <span className="text-gray-600 font-medium">Loading pool data...</span>
          </div>
        </div>
      </main>
    )
  }

  if (poolError) {
    const errorMessage = poolError instanceof Error ? poolError.message : 'Failed to load pool data. Please check the pool address and try again.'
    const isInvalidPool = errorMessage.includes('not a valid LSSVM pool') || 
                         errorMessage.includes('not a contract') ||
                         errorMessage.includes('returned no data')
    
    return (
      <main className="min-h-screen bg-gray-50 py-6 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white border border-red-200 rounded-xl p-8 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-red-900 mb-2">
                  {isInvalidPool ? 'Invalid Pool Address' : 'Error Loading Pool'}
                </h2>
                <p className="text-red-700 mb-4">
                  {isInvalidPool 
                    ? `The address "${poolAddressRaw}" is not a valid LSSVM pool contract. It may be from a different factory or not exist on Base Mainnet.`
                    : errorMessage
                  }
                </p>
                {isInvalidPool && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mt-4">
                    <p className="text-sm text-gray-600 mb-2">
                      <strong>Tips:</strong>
                    </p>
                    <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
                      <li>Make sure the pool address is from the correct factory</li>
                      <li>Verify the pool exists on Base Mainnet (chain ID: 8453)</li>
                      <li>Check that you're using the correct pool address</li>
                    </ul>
                  </div>
                )}
                <div className="text-xs text-gray-500 mt-4 space-y-1">
                  <div>Pool Address: {poolAddressRaw}</div>
                  <div>Chain: {chain.name} ({chain.id})</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    )
  }

  if (!poolData) {
    return (
      <main className="min-h-screen bg-gray-50 py-6 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-5 h-5 rounded-full bg-red-500 flex items-center justify-center mt-0.5">
                <svg className="w-3 h-3 text-white flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" preserveAspectRatio="xMidYMid meet">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <div className="flex-1">
                <div className="text-red-800 font-semibold mb-2">Pool not found</div>
                <div className="text-sm text-red-700 mb-3">
                  No pool found at address {poolAddressRaw} on {chain.name}. Please verify the address and chain ID.
                </div>
                <div className="text-xs text-red-600">Chain ID: {chain.id}</div>
              </div>
            </div>
          </div>
        </div>
      </main>
    )
  }

  // These computed values are already defined above with hooks
  // (isETH, hasSelection, canBuy are computed above before early returns)

  return (
    <main className="min-h-screen bg-gray-50 py-4 px-4">
      <div className="max-w-2xl mx-auto space-y-3">
        <div className="mb-1">
          <h1 className="text-xl font-bold text-gray-900">Buy NFTs</h1>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
          <h2 className="font-semibold text-sm text-gray-900 mb-2">Pool Information</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
            <div className="flex flex-col">
              <span className="text-gray-500 text-xs mb-0.5">Pool</span>
              <span className="font-mono text-gray-900 text-xs">{poolData.address.slice(0, 6)}...{poolData.address.slice(-4)}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-gray-500 text-xs mb-0.5">NFT</span>
              <span className="font-mono text-gray-900 text-xs">{poolData.nft.slice(0, 6)}...{poolData.nft.slice(-4)}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-gray-500 text-xs mb-0.5">Token</span>
              <span className="font-semibold text-gray-900 text-xs">{isETH ? 'ETH' : tokenData?.symbol || '...'}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-gray-500 text-xs mb-0.5">Network</span>
              <span className="font-semibold text-gray-900 text-xs">{chain.name}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-gray-500 text-xs mb-0.5">Standard</span>
              <span className="font-semibold text-gray-900 text-xs">
                {isDetectingERC1155 ? '...' : isERC1155 ? (
                  <>1155 {poolNftId !== null && <span className="text-gray-600 font-normal">#{poolNftId.toString()}</span>}</>
                ) : '721'}
              </span>
            </div>
          </div>
        </div>

        {!isERC1155 && <ManualNFTInput onIdsChange={setManualNFTIds} />}
        {isERC1155 && poolNftId !== null && (
          <div className="bg-white border border-gray-200 rounded-lg p-3">
            <h3 className="font-semibold text-sm text-gray-900 mb-2">ERC1155 Purchase</h3>
            <div className="space-y-2">
              <div>
                <label className="block text-xs font-semibold text-gray-900 mb-1">
                  Quantity: <span className="text-blue-600">{erc1155Quantity}</span>
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="1"
                    value={erc1155Quantity}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10)
                      if (!isNaN(val) && val > 0) {
                        setErc1155Quantity(val)
                      }
                    }}
                    className="w-20 px-2 py-1.5 border border-gray-300 rounded text-center font-semibold text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                  <input
                    type="range"
                    min="1"
                    max="100"
                    value={erc1155Quantity}
                    onChange={(e) => setErc1155Quantity(parseInt(e.target.value, 10))}
                    className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                </div>
                <div className="text-xs text-gray-500 mt-0.5">NFT ID: #{poolNftId.toString()}</div>
              </div>
            </div>
          </div>
        )}

        {buyQuote && (
          <PriceQuote
            label="Buy Quote"
            totalAmount={buyQuote.inputAmount}
            protocolFee={buyQuote.protocolFee}
            royaltyAmount={buyQuote.royaltyAmount}
            error={buyQuote.error}
            decimals={isETH ? 18 : tokenData?.decimals || 18}
          />
        )}

        {quoteLoading && (
          <div className="bg-white border border-gray-200 rounded-lg p-3 flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-400 border-t-transparent"></div>
            <span className="text-gray-600 text-sm">Loading quote...</span>
          </div>
        )}

        {!userAddress && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <div className="flex items-start gap-2 mb-2">
              <div className="flex-shrink-0 w-4 h-4 rounded-full bg-yellow-500 flex items-center justify-center mt-0.5">
                <svg className="w-2.5 h-2.5 text-white flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" preserveAspectRatio="xMidYMid meet">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="flex-1">
                <div className="text-yellow-800 font-semibold text-sm mb-1">Wallet Not Connected</div>
                <div className="text-xs text-yellow-700 mb-2">Please connect your wallet to continue</div>
                {isMiniapp && connectors.length > 0 && (
                  <button
                    onClick={() => {
                      const farcasterConnector = connectors.find(
                        c => c.id === 'farcaster' || c.name?.toLowerCase().includes('farcaster')
                      )
                      if (farcasterConnector) {
                        connect({ connector: farcasterConnector })
                      } else {
                        console.error('Farcaster connector not found. Available:', connectors.map(c => c.id))
                      }
                    }}
                    disabled={isConnecting}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                  >
                    {isConnecting ? 'Connecting...' : 'Connect Wallet'}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {userAddress && (
          <>
            <div className="bg-white border border-gray-200 rounded-lg p-3">
              <label className="block text-xs font-semibold text-gray-900 mb-2">
                Slippage: <span className="text-blue-600">{slippageTolerance}%</span>
              </label>
              <input
                type="range"
                min="1"
                max="10"
                value={slippageTolerance}
                onChange={(e) => setSlippageTolerance(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-0.5">
                <span>1%</span>
                <span>10%</span>
              </div>
            </div>

            <button
              onClick={handleBuy}
              disabled={!canBuy || isApproving || isApprovalConfirming}
              title={
                isApproving || isApprovalConfirming
                  ? 'Approval transaction in progress...'
                  : !canBuy
                    ? `Cannot buy: ${!userAddress ? 'Connect wallet' : !hasSelection ? (isERC1155 ? 'Waiting for pool detection...' : 'Select at least one NFT') : !buyQuote ? 'Loading quote...' : buyQuote.error !== CurveError.OK ? `Quote error: ${buyQuote.error}` : isWriting || isConfirming ? 'Transaction in progress...' : 'Unknown'}`
                    : 'Buy NFTs'
              }
              className={`w-full py-3 rounded-lg font-semibold text-base transition-all shadow-sm ${
                canBuy && !isApproving && !isApprovalConfirming
                  ? 'bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700 hover:shadow-md active:scale-[0.98]'
                  : 'bg-gray-200 text-gray-500 cursor-not-allowed'
              }`}
            >
              {isApproving || isApprovalConfirming
                ? 'Approving tokens...'
                : isWriting || isConfirming
                  ? 'Processing transaction...'
                  : `Buy ${numItems} NFT${numItems !== 1 ? 's' : ''}`}
            </button>
          </>
        )}

        {/* Approval transaction status */}
        {(isApproving || isApprovalConfirming || approvalHash || approvalError || isApprovalSuccess) && (
          <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
            <div className="font-semibold text-sm text-gray-900 mb-2">Token Approval Status</div>
            <TransactionStatus
              status={
                isApproving || isApprovalConfirming
                  ? 'pending'
                  : isApprovalSuccess
                    ? 'success'
                    : approvalError || approvalTxError
                      ? 'error'
                      : 'idle'
              }
              hash={approvalHash}
              error={(approvalError || approvalTxError) as Error | null}
            />
            {isApprovalSuccess && (
              <div className="mt-2 text-xs text-green-700 bg-green-50 border border-green-200 rounded p-2">
                ✓ Approval confirmed! Click "Buy {numItems} NFT{numItems !== 1 ? 's' : ''}" to complete.
              </div>
            )}
            {(isApproving || isApprovalConfirming) && (
              <div className="mt-2 text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded p-2">
                Waiting for approval... Click "Buy {numItems} NFT{numItems !== 1 ? 's' : ''}" again once confirmed.
              </div>
            )}
          </div>
        )}

        {/* Main buy transaction status */}
        <TransactionStatus
          status={
            isWriting || isConfirming
              ? 'pending'
              : isSuccess
                ? 'success'
                : writeError || txError
                  ? 'error'
                  : 'idle'
          }
          hash={hash}
          error={(writeError || txError) as Error | null}
        />
      </div>
    </main>
  )
}

