
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY')
const EMAIL_FROM = Deno.env.get('EMAIL_FROM')

serve(async (req) => {
  const { donor, type, requester } = await req.json()

  let subject = ''
  let html = ''

  if (type === 'greeting') {
    subject = 'Welcome to LifeSave Blood Network!'
    html = `<h2>Welcome, ${donor.name}!</h2><p>Thank you for registering...</p>`
  } else if (type === 'request') {
    subject = `URGENT: ${requester.bloodGroup} Blood Needed!`
    html = `<h2>Emergency!</h2><p>${requester.name} needs blood in ${requester.village}.</p><a href="${donor.acceptUrl}">ACCEPT</a>`
  }

  const res = await fetch('https://api.sendgrid.com/v2/mail.send.json', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SENDGRID_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: donor.email }] }],
      from: { email: EMAIL_FROM, name: 'LifeSave' },
      subject: subject,
      content: [{ type: 'text/html', value: html }],
    }),
  })

  return new Response(JSON.stringify({ success: res.ok }), { headers: { 'Content-Type': 'application/json' } })
})
