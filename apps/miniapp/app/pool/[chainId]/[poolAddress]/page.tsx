'use client'

import { useParams } from 'next/navigation'
import { isAddress } from 'viem'
import { usePoolData } from '@/hooks/usePoolData'
import { PoolDetails } from '@/components/PoolDetails'
import { Address } from 'viem'
import { base } from 'viem/chains'
import { useState, useEffect } from 'react'
import { getPublicClient } from '@/lib/wagmi'
import { LSSVM_PAIR_ABI } from '@/lib/contracts'

function getChainFromId(chainId: string | string[]) {
  const id = typeof chainId === 'string' ? parseInt(chainId) : parseInt(chainId[0])
  if (id !== base.id) {
    throw new Error(`Unsupported chain: ${id}. Only Base Mainnet (${base.id}) is currently supported.`)
  }
  return base
}

export default function PoolPage() {
  const params = useParams()
  const chainId = params.chainId as string
  const poolAddress = params.poolAddress as string

  const chain = getChainFromId(chainId)
  
  const [isERC1155, setIsERC1155] = useState<boolean>(false)
  const [poolNftId, setPoolNftId] = useState<bigint | null>(null)
  const [isDetectingERC1155, setIsDetectingERC1155] = useState<boolean>(true)

  const { data: poolData, isLoading, error } = usePoolData(poolAddress as Address, chain.id)

  // Detect ERC1155 pool
  useEffect(() => {
    if (!poolData?.address || !chain) return

    const detectERC1155 = async () => {
      setIsDetectingERC1155(true)
      const client = getPublicClient(chain.id)
      
      // Method 1: Try calling nftId() - ERC1155 pairs have this, ERC721 pairs don't
      // This is expected to fail for ERC721 pools, so we silently catch and continue
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
        // Expected to fail for ERC721 pools - silently continue to next detection method
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
        
        setIsDetectingERC1155(false)
        return
      } catch (variantError) {
        console.warn('Error calling pairVariant:', variantError)
        setIsDetectingERC1155(false)
      }
    }

    detectERC1155()
  }, [poolData?.address, chain])

  if (!isAddress(poolAddress)) {
    return (
      <main className="min-h-screen p-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-red-600">Invalid pool address</div>
        </div>
      </main>
    )
  }

  if (isLoading || isDetectingERC1155) {
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

  if (error || !poolData) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const isInvalidPool = errorMessage.includes('not a valid LSSVM pool') || 
                         errorMessage.includes('not a contract') ||
                         errorMessage.includes('returned no data')
    
    return (
      <main className="min-h-screen p-4 bg-gray-50">
        <div className="max-w-4xl mx-auto">
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
                    ? `The address "${poolAddress}" is not a valid LSSVM pool contract. It may be from a different factory or not exist on Base Mainnet.`
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
              </div>
            </div>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen p-4">
      <div className="max-w-4xl mx-auto">
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
        />
      </div>
    </main>
  )
}

