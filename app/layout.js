import './globals.css'

export const metadata = {
  title: 'Kiyora Store',
  description: 'Premium Digital Assets',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}