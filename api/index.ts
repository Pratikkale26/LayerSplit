import express from 'express'
import { prisma } from './src/db/client'

const app = express()

app.get('/', async(req, res) => {
    const users = await prisma.user.findMany()
    res.json(users)
})

app.listen(3000, () => {
    console.log('Server started on port 3000')
})