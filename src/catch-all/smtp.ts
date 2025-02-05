import net from 'net'
import { OutputFormat, createOutput } from '../output/output'
import { hasCode, ErrorCodes } from './errorCodes'

const log = (...args: unknown[]) => {
  if (process.env.DEBUG === 'true') {
    console.log(...args)
  }
}

export const checkCatchAll = async (sender: string, recipient: string, domain: string, exchange: string): Promise<OutputFormat> => {
  const timeout = 1000 * 10 // 10 seconds
  return new Promise(r => {
    let receivedData = false
    const socket = net.createConnection(25, exchange)
    socket.setEncoding('ascii')
    socket.setTimeout(timeout)
    socket.on('error', error => {
      log('error', error)
      socket.emit('fail', error)
    })
    socket.on('close', hadError => {
      // if (!receivedData && !hadError) {
        socket.emit('fail', 'Mail server closed connection without sending any data.')
      // }
    })
    socket.once('fail', msg => {
      r(createOutput('catchAll', msg))
      if (socket.writable && !socket.destroyed) {
        socket.write(`quit\r\n`)
        socket.end()
        socket.destroy()
      }
    })

    socket.on('success', () => {
      if (socket.writable && !socket.destroyed) {
        socket.write(`quit\r\n`)
        socket.end()
        socket.destroy()
      }
      r(createOutput())
    })

    const commands = [`helo ${exchange}\r\n`, `mail from: <${sender}>\r\n`, `rcpt to: <orfeorineorineorinveoinvtoinvrotnivrotinvotnivrotvinrotvni@${domain}>\r\n`]
    let i = 0
    socket.on('next', () => {
      if (i < 3) {
        if (socket.writable) {
          socket.write(commands[i++])
        } else {
          socket.emit('fail', 'SMTP communication unexpectedly closed.')
        }
      } else {
        socket.emit('fail', 'The server is likely to have catch-all enabled')
      }
    })

    socket.on('timeout', () => {
      socket.emit('fail', 'Timeout')
    })

    socket.on('connect', () => {
      socket.on('data', msg => {
        receivedData = true
        log('data', msg)
        if (hasCode(msg, 220) || hasCode(msg, 250)) {
          socket.emit('next', msg)
        } else if (hasCode(msg, 550)) {
          socket.emit('success', 'Mailbox not found.')
        } else {
          const [code] = Object.typedKeys(ErrorCodes).filter(x => hasCode(msg, x))
          socket.emit('fail', ErrorCodes[code] || 'Unrecognized SMTP response.')
        }
      })
    })
  })
}
