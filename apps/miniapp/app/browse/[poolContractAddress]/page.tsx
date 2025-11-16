'use client'

import { useParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { isAddress, Address } from 'viem'
import { base } from 'viem/chains'
import Link from 'next/link'
import { formatPrice } from '@/lib/pool'

interface PoolInfo {
  poolAddress: Address
  spotPrice: bigint
  poolType: number
  nftAddress: Address
}

async function fetchPools(contractAddress: string): Promise<PoolInfo[]> {
  const response = await fetch(`/api/pools/${contractAddress}`)
  if (!response.ok) {
    throw new Error('Failed to fetch pools')
  }
  const data = await response.json()
  return data.pools || []
}

interface PoolCardProps {
  poolAddress: Address
  spotPrice: bigint
  poolType: number
  chainId: number
}

function PoolCard({ poolAddress, spotPrice, poolType, chainId }: PoolCardProps) {
  const poolTypeLabel = poolType === 0 ? 'TOKEN' : poolType === 1 ? 'NFT' : 'TRADE'

  return (
    <Link href={`/pool/${chainId}/${poolAddress}`}>
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
        <div className="flex justify-between items-start mb-3">
          <div className="font-mono text-sm text-gray-600 truncate flex-1">
            {poolAddress.slice(0, 10)}...{poolAddress.slice(-8)}
          </div>
          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded font-semibold whitespace-nowrap ml-2">
            {poolTypeLabel}
          </span>
        </div>
        <div className="text-sm text-gray-600">
          <div className="font-medium text-gray-900">
            Spot Price: {formatPrice(spotPrice)} ETH
          </div>
        </div>
      </div>
    </Link>
  )
}

export default function BrowsePage() {
  const params = useParams()
  const poolContractAddress = params.poolContractAddress as string
  const chainId = base.id // Only Base mainnet for now

  const { data: pools, isLoading, error } = useQuery({
    queryKey: ['pools', poolContractAddress],
    queryFn: () => fetchPools(poolContractAddress),
    enabled: isAddress(poolContractAddress),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  if (!isAddress(poolContractAddress)) {
    return (
      <main className="min-h-screen p-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-red-600">Invalid contract address</div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen p-4 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Pools for Contract</h1>
          <div className="text-sm text-gray-600 font-mono break-all mb-4">
            {poolContractAddress}
          </div>
        </div>

        {isLoading ? (
          <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-500">Loading pools...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center">
            <p className="text-red-600 font-semibold mb-2">Error loading pools</p>
            <p className="text-sm text-red-500">
              {error instanceof Error ? error.message : 'Unknown error occurred'}
            </p>
          </div>
        ) : !pools || pools.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
            <p className="text-gray-500 mb-2">No pools found for this contract.</p>
            <p className="text-sm text-gray-400">
              Pools are discovered by querying factory events. If you just created a pool, it may take a moment to appear.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pools.map((pool) => (
              <PoolCard
                key={pool.poolAddress}
                poolAddress={pool.poolAddress}
                spotPrice={pool.spotPrice}
                poolType={pool.poolType}
                chainId={chainId}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  )
}

