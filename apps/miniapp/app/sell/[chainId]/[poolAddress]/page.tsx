'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Address, isAddress, getAddress } from 'viem'
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { usePoolData } from '@/hooks/usePoolData'
import { useSellQuote } from '@/hooks/useSellQuote'
import { useUserERC721NFTs, useUserERC1155Balance } from '@/hooks/useUserNFTs'
import { useUserNFTsWithMetadata } from '@/hooks/useUserNFTsWithMetadata'
import { useTokenData } from '@/hooks/useTokenData'
import { NFTSelector, ManualNFTInput } from '@/components/NFTSelector'
import { PriceQuote } from '@/components/PriceQuote'
import { TransactionStatus } from '@/components/TransactionStatus'
import { UserNFTCard } from '@/components/UserNFTCard'
import { QuantitySelector } from '@/components/QuantitySelector'
import { PoolDetails } from '@/components/PoolDetails'
import { LSSVM_ROUTER_ABI, LSSVM_PAIR_ABI, LSSVM_FACTORY_ABI, getRouterAddress, getFactoryAddress, ERC721_ABI, ERC1155_ABI, CurveError } from '@/lib/contracts'
import { formatPrice } from '@/lib/pool'
import { getPublicClient } from '@/lib/wagmi'
import { base } from 'viem/chains'

function getChainFromId(chainId: string | string[]) {
  const id = typeof chainId === 'string' ? parseInt(chainId) : parseInt(chainId[0])
  if (id !== base.id) {
    throw new Error(`Unsupported chain: ${id}. Only Base Mainnet (${base.id}) is currently supported.`)
  }
  return base
}

export default function SellPage() {
  const params = useParams()
  const router = useRouter()
  
  // Extract and normalize route parameters
  const chainIdParam = params.chainId
  const poolAddressParam = params.poolAddress
  
  // Handle Next.js params which can be string or string[]
  let chainId = Array.isArray(chainIdParam) ? chainIdParam[0] : chainIdParam
  let poolAddressRaw = Array.isArray(poolAddressParam) ? poolAddressParam[0] : poolAddressParam
  
  // Fallback to sessionStorage if params are missing (for mini-app navigation issues)
  const [isCheckingFallback, setIsCheckingFallback] = useState(true)
  useEffect(() => {
    if ((!chainId || !poolAddressRaw) && typeof window !== 'undefined') {
      try {
        const stored = sessionStorage.getItem('lastPoolData')
        if (stored) {
          const { chainId: storedChainId, poolAddress: storedPoolAddress } = JSON.parse(stored)
          if (storedChainId && storedPoolAddress) {
            // Redirect to the correct URL with the stored params
            router.replace(`/sell/${storedChainId}/${storedPoolAddress}`)
            return
          }
        }
      } catch (error) {
        console.error('Error reading sessionStorage:', error)
      }
    }
    setIsCheckingFallback(false)
  }, [chainId, poolAddressRaw, router])
  
  const { address: userAddress } = useAccount()
  
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
  
  // Validate params before proceeding
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
            <div className="text-xs text-gray-500 mt-2">
              URL params: chainId={chainId || 'none'}, poolAddress={poolAddressRaw || 'none'}
            </div>
          </div>
        </div>
      </main>
    )
  }
  
  // Parse and validate chain ID
  let chain
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

  // Normalize and validate pool address
  let poolAddress: Address | undefined
  try {
    if (isAddress(poolAddressRaw)) {
      poolAddress = getAddress(poolAddressRaw) // Normalize to checksummed address
    }
  } catch (error) {
    // Address is invalid
  }
  
  if (!poolAddress) {
    return (
      <main className="min-h-screen p-4">
        <div className="max-w-2xl mx-auto">
          <div className="border rounded-lg p-4 bg-red-50">
            <div className="text-red-600 font-semibold mb-2">Invalid Pool Address</div>
            <div className="text-sm text-red-500">The pool address "{poolAddressRaw}" is not a valid Ethereum address.</div>
            <div className="text-xs text-gray-500 mt-2">Received: {poolAddressRaw || 'undefined'}</div>
          </div>
        </div>
      </main>
    )
  }
  
  const [selectedNFTIds, setSelectedNFTIds] = useState<bigint[]>([])
  const [manualNFTIds, setManualNFTIds] = useState<bigint[]>([])
  const [slippageTolerance, setSlippageTolerance] = useState(5) // 5%
  const [isApproved, setIsApproved] = useState(false)
  const [checkingApproval, setCheckingApproval] = useState(false)

  const { data: poolData, isLoading: poolLoading, error: poolError } = usePoolData(
    poolAddress,
    chain.id
  )

  // Detect if this is an ERC1155 pool (similar to buy page)
  const [isERC1155, setIsERC1155] = useState<boolean>(false)
  const [poolNftId, setPoolNftId] = useState<bigint | null>(null)
  const [isDetectingERC1155, setIsDetectingERC1155] = useState(false)
  const [quantity, setQuantity] = useState<number>(1) // For ERC1155 quantity selector

  useEffect(() => {
    if (!poolData?.address || !chain) return
    
    const detectERC1155 = async () => {
      setIsDetectingERC1155(true)
      const client = getPublicClient(chain.id)
      
      try {
        const nftId = await client.readContract({
          address: poolData.address,
          abi: LSSVM_PAIR_ABI,
          functionName: 'nftId',
        }) as bigint
        
        setIsERC1155(true)
        setPoolNftId(nftId)
        setIsDetectingERC1155(false)
        return
      } catch (nftIdError) {
        // Try pairVariant as fallback
        try {
          const pairVariant = await client.readContract({
            address: poolData.address,
            abi: LSSVM_PAIR_ABI,
            functionName: 'pairVariant',
          }) as number
          
          const is1155 = pairVariant === 2 || pairVariant === 3
          setIsERC1155(is1155)
          
          if (is1155) {
            try {
              const nftId = await client.readContract({
                address: poolData.address,
                abi: LSSVM_PAIR_ABI,
                functionName: 'nftId',
              }) as bigint
              setPoolNftId(nftId)
            } catch (err) {
              console.warn('Failed to get nftId:', err)
            }
          }
        } catch (variantError) {
          // Try factory method
          try {
            const factoryAddress = getFactoryAddress(chain.id)
            const factoryNftType = await client.readContract({
              address: factoryAddress,
              abi: LSSVM_FACTORY_ABI,
              functionName: 'getPairNFTType',
              args: [poolData.address],
            }) as number
            
            const is1155 = factoryNftType === 1
            setIsERC1155(is1155)
            
            if (is1155) {
              try {
                const nftId = await client.readContract({
                  address: poolData.address,
                  abi: LSSVM_PAIR_ABI,
                  functionName: 'nftId',
                }) as bigint
                setPoolNftId(nftId)
              } catch (err) {
                console.error('Failed to get nftId:', err)
              }
            }
          } catch (factoryError) {
            console.warn('Error detecting ERC1155:', factoryError)
            setIsERC1155(false)
          }
        }
      }
      
      setIsDetectingERC1155(false)
    }

    detectERC1155()
  }, [poolData?.address, chain])

  const { data: userNFTs } = useUserERC721NFTs(
    !isERC1155 ? poolData?.nft : undefined,
    chain.id
  )

  const { data: userNFTsWithMetadata, isLoading: isLoadingUserNFTs } = useUserNFTsWithMetadata(
    !isERC1155 ? poolData?.nft : undefined,
    chain.id
  )
  
  const { data: erc1155Balance } = useUserERC1155Balance(
    isERC1155 ? poolData?.nft : undefined,
    poolNftId || undefined,
    chain.id
  )
  
  const { data: tokenData } = useTokenData(
    poolData?.token,
    userAddress || undefined,
    chain.id
  )

  // For ERC1155: use pool's nftId and quantity
  // For ERC721: use first selected NFT ID for quote, or first manual ID
  const quoteNFTId = isERC1155 && poolNftId !== null ? poolNftId : (selectedNFTIds[0] || manualNFTIds[0])
  const numNFTs = isERC1155 ? quantity : (selectedNFTIds.length || manualNFTIds.length)

  const { data: sellQuote, isLoading: quoteLoading } = useSellQuote(
    poolData?.address,
    quoteNFTId,
    numNFTs,
    chain.id
  )

  const {
    writeContract: writeContractRouter,
    data: routerHash,
    error: routerError,
    isPending: isRouterWriting,
  } = useWriteContract()

  const {
    writeContract: writeContractNFT,
    data: approvalHash,
    error: approvalError,
    isPending: isApprovalWriting,
  } = useWriteContract()

  const {
    isLoading: isRouterConfirming,
    isSuccess: isRouterSuccess,
    error: routerTxError,
  } = useWaitForTransactionReceipt({
    hash: routerHash,
  })

  const {
    isLoading: isApprovalConfirming,
    isSuccess: isApprovalSuccess,
  } = useWaitForTransactionReceipt({
    hash: approvalHash,
  })

  // Check if NFTs are approved
  useEffect(() => {
    const checkApproval = async () => {
      if (!poolData?.nft || !userAddress) return

      try {
        setCheckingApproval(true)
        const client = getPublicClient(chain.id)
        
        // For ERC1155: approve the pair directly (we call pair directly)
        // For ERC721: approve the router (router calls the pair)
        const approvalTarget = (isERC1155 && poolNftId !== null) ? poolData.address : getRouterAddress(chain.id)
        
        // Check approval using the appropriate ABI
        const approved = await client.readContract({
          address: poolData.nft,
          abi: isERC1155 ? ERC1155_ABI : ERC721_ABI,
          functionName: 'isApprovedForAll',
          args: [userAddress, approvalTarget],
        }) as boolean

        setIsApproved(approved)
      } catch (error) {
        console.error('Error checking approval:', error)
        setIsApproved(false)
      } finally {
        setCheckingApproval(false)
      }
    }

    if (!isDetectingERC1155) {
      checkApproval()
    }
  }, [poolData?.nft, poolData?.address, userAddress, isApprovalSuccess, chain.id, isERC1155, poolNftId, isDetectingERC1155])

  const handleApprove = () => {
    if (!poolData?.nft) return

    try {
      // For ERC1155: approve the pair directly
      // For ERC721: approve the router
      const approvalTarget = (isERC1155 && poolNftId !== null) ? poolData.address : getRouterAddress(chain.id)
      const abi = isERC1155 ? ERC1155_ABI : ERC721_ABI
      
      writeContractNFT({
        address: poolData.nft,
        abi,
        functionName: 'setApprovalForAll',
        args: [approvalTarget, true],
      })
    } catch (error) {
      console.error('Error approving NFTs:', error)
      alert(`Failed to approve NFTs: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const handleSell = async () => {
    if (!poolData || !userAddress || !sellQuote || sellQuote.error !== CurveError.OK) {
      return
    }

    const client = getPublicClient(chain.id)

    // For ERC1155: validate quantity and balance
    if (isERC1155 && poolNftId !== null) {
      if (quantity <= 0) {
        alert('Please select a quantity greater than 0')
        return
      }
      
      const balance = erc1155Balance || 0n
      if (balance < BigInt(quantity)) {
        alert(`Insufficient balance. You have ${balance.toString()} but trying to sell ${quantity}`)
        return
      }
    } else {
      // For ERC721: validate NFT IDs
      const nftIds = selectedNFTIds.length > 0 ? selectedNFTIds : manualNFTIds
      if (nftIds.length === 0) {
        alert('Please select at least one NFT')
        return
      }
    }

    try {
      // Calculate min output with slippage
      const minOutput = (sellQuote.outputAmount * BigInt(100 - slippageTolerance)) / BigInt(100)

      // For ERC1155 pairs, call the pair directly (bypassing router)
      // The router's quote validation doesn't work correctly for ERC1155
      if (isERC1155 && poolNftId !== null) {
        console.log('Calling ERC1155 pair directly for sell:', {
          pair: poolData.address,
          numNFTs: [quantity],
          minExpectedTokenOutput: minOutput.toString(),
          tokenRecipient: userAddress,
          isRouter: false,
          routerCaller: '0x0000000000000000000000000000000000000000',
        })

        // Call swapNFTsForToken directly on the pair
        // numNFTs[0] = quantity
        writeContractRouter({
          address: poolData.address,
          abi: LSSVM_PAIR_ABI,
          functionName: 'swapNFTsForToken',
          args: [
            [BigInt(quantity)], // numNFTs array: [quantity]
            minOutput, // minExpectedTokenOutput
            userAddress, // tokenRecipient
            false, // isRouter (we're calling directly)
            '0x0000000000000000000000000000000000000000' as Address, // routerCaller (not used when isRouter=false)
          ],
        })
      } else {
        // For ERC721, use the router as normal
        const nftIds = selectedNFTIds.length > 0 ? selectedNFTIds : manualNFTIds
        const routerAddress = getRouterAddress(chain.id)

        writeContractRouter({
          address: routerAddress,
          abi: LSSVM_ROUTER_ABI,
          functionName: 'swapNFTsForToken',
          args: [
            [
              {
                pair: poolData.address,
                nftIds: nftIds,
              },
            ],
            minOutput,
            userAddress, // tokenRecipient
            BigInt(Math.floor(Date.now() / 1000) + 3600), // 1 hour deadline
          ],
        })
      }
    } catch (error) {
      console.error('Error selling NFTs:', error)
      alert(`Failed to sell NFTs: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  if (poolLoading || isDetectingERC1155) {
    return (
      <main className="min-h-screen p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col items-center justify-center gap-4 py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600"></div>
            <div className="text-center">
              <div className="text-lg font-semibold text-gray-900 mb-1">Loading pool data...</div>
              <div className="text-sm text-gray-500">Fetching pool information and detecting pool type</div>
            </div>
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

  // ETH pair if token is zero address (ETH pairs don't have token() function)
  const isETH = poolData.token === '0x0000000000000000000000000000000000000000'
  // For ERC1155: we always have a selection if quantity > 0 and balance > 0
  // For ERC721: require user to select/enter NFT IDs
  const hasSelection = isERC1155 
    ? (quantity > 0 && (erc1155Balance || 0n) >= BigInt(quantity) && !isDetectingERC1155)
    : (selectedNFTIds.length > 0 || manualNFTIds.length > 0)
  const canSell =
    userAddress &&
    hasSelection &&
    sellQuote &&
    sellQuote.error === CurveError.OK &&
    isApproved &&
    !isRouterWriting &&
    !isRouterConfirming

  const nftIdsForSelector = userNFTs?.map((nft) => nft.tokenId) || []

  return (
    <main className="min-h-screen p-4">
      <div className="max-w-4xl mx-auto space-y-3">
        <div className="mb-1">
          <h1 className="text-xl font-bold text-gray-900">Sell NFTs</h1>
        </div>

        {/* Pool Details Section */}
        {poolData && (
          <PoolDetails
            poolAddress={poolData.address}
            poolType={poolData.poolType}
            spotPrice={poolData.spotPrice}
            delta={poolData.delta}
            fee={poolData.fee}
            nftAddress={poolData.nft}
            tokenAddress={poolData.token}
            bondingCurve={poolData.bondingCurve}
            chainId={chain.id}
            isERC1155={isERC1155}
            poolNftId={poolNftId || undefined}
            showCart={false}
          />
        )}

        {/* ERC1155: Show quantity selector */}
        {isERC1155 && poolNftId !== null && erc1155Balance !== undefined && (
          <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
            <h2 className="text-sm font-bold text-gray-900 mb-2">Select Quantity to Sell</h2>
            {erc1155Balance > 0n ? (
              <QuantitySelector
                value={quantity}
                onChange={setQuantity}
                max={Number(erc1155Balance)}
                showPrice={!!sellQuote && sellQuote.error === CurveError.OK && quantity > 0}
                pricePerItem={sellQuote && sellQuote.error === CurveError.OK && quantity > 0 ? sellQuote.outputAmount / BigInt(quantity) : undefined}
                decimals={isETH ? 18 : tokenData?.decimals || 18}
              />
            ) : (
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-center text-gray-500">
                You don't own any of this NFT (ID: {poolNftId.toString()})
              </div>
            )}
          </div>
        )}

        {/* ERC721: Show user's NFTs in grid */}
        {!isERC1155 && (
          <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
            <h2 className="text-sm font-bold text-gray-900 mb-2">Your NFTs</h2>
            {isLoadingUserNFTs ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                  <UserNFTCard key={i} tokenId={0n} metadata={null} isLoading={true} />
                ))}
              </div>
            ) : userNFTsWithMetadata && userNFTsWithMetadata.length > 0 ? (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-4">
                  {userNFTsWithMetadata.map((nft) => (
                    <UserNFTCard
                      key={nft.tokenId.toString()}
                      tokenId={nft.tokenId}
                      metadata={nft.metadata}
                      isLoading={false}
                      isSelected={selectedNFTIds.includes(nft.tokenId)}
                      onSelect={(id) => setSelectedNFTIds([...selectedNFTIds, id])}
                      onDeselect={(id) => setSelectedNFTIds(selectedNFTIds.filter((selectedId) => selectedId !== id))}
                    />
                  ))}
                </div>
                {selectedNFTIds.length > 0 && (
                  <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded">
                    <p className="text-xs text-blue-800">
                      {selectedNFTIds.length} NFT{selectedNFTIds.length !== 1 ? 's' : ''} selected
                    </p>
                  </div>
                )}
                <div className="mt-2 pt-2 border-t border-gray-200">
                  <h3 className="text-xs font-semibold text-gray-700 mb-1">Or enter NFT IDs manually:</h3>
                  <ManualNFTInput onIdsChange={setManualNFTIds} />
                </div>
              </>
            ) : (
              <div className="p-8 bg-gray-50 border border-gray-200 rounded-lg text-center">
                <svg className="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                <p className="text-gray-600 font-medium mb-1">No NFTs found</p>
                <p className="text-sm text-gray-500">You don't own any NFTs from this collection</p>
              </div>
            )}
          </div>
        )}

        {/* Price Quote */}
        {hasSelection && (
          <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
            {quoteLoading ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
                <span className="text-gray-600 text-sm">Loading quote...</span>
              </div>
            ) : sellQuote ? (
              <PriceQuote
                label="Sell Quote"
                totalAmount={sellQuote.outputAmount}
                protocolFee={sellQuote.protocolFee}
                royaltyAmount={sellQuote.royaltyAmount}
                error={sellQuote.error}
                decimals={isETH ? 18 : tokenData?.decimals || 18}
              />
            ) : null}
          </div>
        )}

        {!userAddress && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <div className="flex-shrink-0 w-4 h-4 rounded-full bg-yellow-500 flex items-center justify-center mt-0.5">
                <svg className="w-2.5 h-2.5 text-white flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" preserveAspectRatio="xMidYMid meet">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="flex-1">
                <div className="text-yellow-800 font-semibold text-sm mb-0.5">Wallet Not Connected</div>
                <div className="text-xs text-yellow-700">Please connect your wallet to view and sell your NFTs</div>
              </div>
            </div>
          </div>
        )}

        {userAddress && (
          <>
            {checkingApproval ? (
              <div className="bg-white border border-gray-200 rounded-lg p-3 flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
                <span className="text-gray-600 text-sm">Checking approval...</span>
              </div>
            ) : !isApproved ? (
              <div className="space-y-2">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <div className="flex-shrink-0 w-4 h-4 rounded-full bg-yellow-500 flex items-center justify-center mt-0.5">
                      <svg className="w-2.5 h-2.5 text-white flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" preserveAspectRatio="xMidYMid meet">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <div className="text-yellow-800 font-semibold text-sm mb-0.5">Approval Required</div>
                      <div className="text-xs text-yellow-700 mb-2">
                        {isERC1155 ? 'Approve the pool to transfer your ERC1155 NFTs' : 'Approve the router to transfer your NFTs'}
                      </div>
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleApprove}
                  disabled={isApprovalWriting || isApprovalConfirming}
                  className={`w-full py-3 rounded-lg font-semibold text-base transition-all shadow-sm ${
                    isApprovalWriting || isApprovalConfirming
                      ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-md active:scale-[0.98]'
                  }`}
                >
                  {isApprovalWriting || isApprovalConfirming
                    ? 'Approving...'
                    : 'Approve NFTs'}
                </button>
                <TransactionStatus
                  status={
                    isApprovalWriting || isApprovalConfirming
                      ? 'pending'
                      : isApprovalSuccess
                        ? 'success'
                        : approvalError
                          ? 'error'
                          : 'idle'
                  }
                  hash={approvalHash}
                  error={approvalError as Error | null}
                />
              </div>
            ) : (
              <>
                <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm space-y-3">
                  <div>
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
                    onClick={handleSell}
                    disabled={!canSell}
                    className={`w-full py-3 rounded-lg font-semibold text-base transition-all shadow-sm ${
                      canSell
                        ? 'bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 hover:shadow-md active:scale-[0.98]'
                        : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    {isRouterWriting || isRouterConfirming
                      ? 'Processing transaction...'
                      : `Sell ${numNFTs} NFT${numNFTs !== 1 ? 's' : ''}`}
                  </button>

                  <TransactionStatus
                    status={
                      isRouterWriting || isRouterConfirming
                        ? 'pending'
                        : isRouterSuccess
                          ? 'success'
                          : routerError || routerTxError
                            ? 'error'
                            : 'idle'
                    }
                    hash={routerHash}
                    error={(routerError || routerTxError) as Error | null}
                  />
                </div>
              </>
            )}
          </>
        )}

      </div>
    </main>
  )
}

