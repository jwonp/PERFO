import Redis from 'ioredis'

const redis = new Redis()

export async function decrementStock(eventId: string): Promise<boolean> {
    const remaining = await redis.decr(`stock:${eventId}`)
    return remaining >= 0
}