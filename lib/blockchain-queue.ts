// Blockchain transaction queue to prevent nonce collisions
// When multiple API calls happen simultaneously, they could try to send blockchain transactions
// with the same nonce, causing "already known" errors. This queue ensures sequential execution.

import { ethers } from 'ethers'

interface QueuedTransaction {
  id: string
  execute: () => Promise<any>
  resolve: (value: any) => void
  reject: (error: any) => void
}

class BlockchainTransactionQueue {
  private queue: QueuedTransaction[] = []
  private processing = false
  private lastNonce: number | null = null
  private lastNonceTime: number = 0
  private readonly NONCE_CACHE_MS = 5000 // Cache nonce for 5 seconds

  /**
   * Add a transaction to the queue
   */
  async enqueue<T>(id: string, transactionFn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push({
        id,
        execute: transactionFn,
        resolve,
        reject,
      })

      // Start processing if not already processing
      if (!this.processing) {
        this.processQueue()
      }
    })
  }

  /**
   * Process the queue sequentially
   */
  private async processQueue() {
    if (this.processing || this.queue.length === 0) {
      return
    }

    this.processing = true

    while (this.queue.length > 0) {
      const transaction = this.queue.shift()!

      try {
        console.log(`🔄 [Queue] Processing transaction: ${transaction.id}`)
        console.log(`   Queue length: ${this.queue.length} remaining`)

        const result = await transaction.execute()
        transaction.resolve(result)

        console.log(`✅ [Queue] Transaction ${transaction.id} completed successfully`)

        // Small delay between transactions to avoid rapid-fire issues
        if (this.queue.length > 0) {
          await new Promise(resolve => setTimeout(resolve, 500))
        }
      } catch (error) {
        console.error(`❌ [Queue] Transaction ${transaction.id} failed:`, error)
        transaction.reject(error)
      }
    }

    this.processing = false
  }

  /**
   * Get the current nonce for a wallet, with caching to avoid race conditions
   */
  async getNonce(wallet: ethers.Wallet, provider: ethers.JsonRpcProvider): Promise<number> {
    const now = Date.now()

    // If we have a recent nonce, increment it
    if (this.lastNonce !== null && now - this.lastNonceTime < this.NONCE_CACHE_MS) {
      this.lastNonce++
      this.lastNonceTime = now
      console.log(`🔢 [Nonce] Using incremented cached nonce: ${this.lastNonce}`)
      return this.lastNonce
    }

    // Otherwise, fetch from network
    const nonce = await provider.getTransactionCount(wallet.address, 'pending')
    this.lastNonce = nonce
    this.lastNonceTime = now
    console.log(`🔢 [Nonce] Fetched fresh nonce from network: ${nonce}`)
    return nonce
  }

  /**
   * Clear the nonce cache (call this after a transaction fails)
   */
  clearNonceCache() {
    this.lastNonce = null
    this.lastNonceTime = 0
    console.log('🔢 [Nonce] Cache cleared')
  }

  /**
   * Get queue status
   */
  getStatus() {
    return {
      queueLength: this.queue.length,
      processing: this.processing,
      lastNonce: this.lastNonce,
    }
  }
}

// Singleton instance
export const blockchainQueue = new BlockchainTransactionQueue()
