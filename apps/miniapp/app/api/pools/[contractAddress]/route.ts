import { NextRequest, NextResponse } from 'next/server'
import { createPublicClient, http, Address, isAddress } from 'viem'
import { base } from 'viem/chains'
import { CONFIG } from '@/lib/config'
import { getFactoryAddress } from '@/lib/contracts'
import { LSSVM_PAIR_ABI } from '@/lib/contracts'

// Simple in-memory cache
const cache = new Map<string, { data: any; timestamp: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

interface PoolInfo {
  poolAddress: Address
  spotPrice: bigint
  poolType: number
  nftAddress: Address
}

/**
 * API route to discover pools for a given NFT contract address
 * Queries factory events to find all pools created for the contract
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { contractAddress: string } }
) {
  try {
    const { contractAddress } = params

    // Validate address
    if (!isAddress(contractAddress)) {
      return NextResponse.json(
        { error: 'Invalid contract address' },
        { status: 400 }
      )
    }

    // Check cache
    const cacheKey = `pools-${contractAddress.toLowerCase()}`
    const cached = cache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return NextResponse.json({ pools: cached.data })
    }

    // Get factory address
    const factoryAddress = getFactoryAddress(base.id)
    const rpcUrl = CONFIG.BASE_RPC_URL

    // Create public client
    const client = createPublicClient({
      chain: base,
      transport: http(rpcUrl),
    })

    // Query for NewERC721Pair events
    // Note: We can't filter by NFT address directly in the event, so we'll get all events
    // and filter client-side. For production, consider using a subgraph.
    const erc721PairEvents = await client.getLogs({
      address: factoryAddress,
      event: {
        type: 'event',
        name: 'NewERC721Pair',
        inputs: [
          { indexed: true, name: 'poolAddress', type: 'address' },
          { indexed: false, name: 'initialIds', type: 'uint256[]' },
        ],
      },
      fromBlock: 'earliest',
      toBlock: 'latest',
    })

    // Query for NewERC1155Pair events
    const erc1155PairEvents = await client.getLogs({
      address: factoryAddress,
      event: {
        type: 'event',
        name: 'NewERC1155Pair',
        inputs: [
          { indexed: true, name: 'poolAddress', type: 'address' },
          { indexed: false, name: 'initialBalance', type: 'uint256' },
        ],
      },
      fromBlock: 'earliest',
      toBlock: 'latest',
    })

    // Get pool details for each discovered pool
    const pools: PoolInfo[] = []
    const checkedPools = new Set<string>()

    // Process ERC721 pools
    for (const event of erc721PairEvents) {
      const poolAddress = event.args.poolAddress as Address
      if (checkedPools.has(poolAddress.toLowerCase())) continue
      checkedPools.add(poolAddress.toLowerCase())

      try {
        // Get pool details
        const [poolType, spotPrice, nft] = await Promise.all([
          client.readContract({
            address: poolAddress,
            abi: LSSVM_PAIR_ABI,
            functionName: 'poolType',
          }),
          client.readContract({
            address: poolAddress,
            abi: LSSVM_PAIR_ABI,
            functionName: 'spotPrice',
          }),
          client.readContract({
            address: poolAddress,
            abi: LSSVM_PAIR_ABI,
            functionName: 'nft',
          }),
        ])

        // Filter by NFT contract address
        if (nft.toLowerCase() === contractAddress.toLowerCase()) {
          pools.push({
            poolAddress,
            spotPrice: spotPrice as bigint,
            poolType: Number(poolType),
            nftAddress: nft as Address,
          })
        }
      } catch (error) {
        // Pool might not exist or be invalid, skip it
        console.warn(`Error fetching pool ${poolAddress}:`, error)
      }
    }

    // Process ERC1155 pools
    for (const event of erc1155PairEvents) {
      const poolAddress = event.args.poolAddress as Address
      if (checkedPools.has(poolAddress.toLowerCase())) continue
      checkedPools.add(poolAddress.toLowerCase())

      try {
        // Get pool details
        const [poolType, spotPrice, nft] = await Promise.all([
          client.readContract({
            address: poolAddress,
            abi: LSSVM_PAIR_ABI,
            functionName: 'poolType',
          }),
          client.readContract({
            address: poolAddress,
            abi: LSSVM_PAIR_ABI,
            functionName: 'spotPrice',
          }),
          client.readContract({
            address: poolAddress,
            abi: LSSVM_PAIR_ABI,
            functionName: 'nft',
          }),
        ])

        // Filter by NFT contract address
        if (nft.toLowerCase() === contractAddress.toLowerCase()) {
          pools.push({
            poolAddress,
            spotPrice: spotPrice as bigint,
            poolType: Number(poolType),
            nftAddress: nft as Address,
          })
        }
      } catch (error) {
        // Pool might not exist or be invalid, skip it
        console.warn(`Error fetching pool ${poolAddress}:`, error)
      }
    }

    // Cache results
    cache.set(cacheKey, {
      data: pools,
      timestamp: Date.now(),
    })

    return NextResponse.json({ pools })
  } catch (error) {
    console.error('Error fetching pools:', error)
    return NextResponse.json(
      { error: 'Failed to fetch pools', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

