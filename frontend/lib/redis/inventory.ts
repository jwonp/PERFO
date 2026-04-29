import Redis from 'ioredis'

const redis = new Redis()

export const decrementStock = async (eventId: string): Promise<boolean> => {
    const remaining = await redis.decr(`stock:${eventId}`)
    return remaining >= 0
}
