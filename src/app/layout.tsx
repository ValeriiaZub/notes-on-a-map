'use client'

import { Inter, Permanent_Marker } from "next/font/google"; // Import Permanent_Marker
import "./globals.css";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const inter = Inter({ subsets: ["latin"] });
// Instantiate Permanent Marker font
const permanentMarker = Permanent_Marker({
  subsets: ['latin'],
  weight: '400', // Permanent Marker only has weight 400
  variable: '--font-permanent-marker', // Optional: Define CSS variable if needed elsewhere
});

// Client component wrapper for React Query
function Providers({ children }: { children: React.ReactNode }) {
  const queryClient =  new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // 1 minute
        refetchOnWindowFocus: true,
      },
    },
  })

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Add font variable to html tag if needed, or just rely on font being loaded
  return (
    <html lang="en" className={permanentMarker.variable}>
      <body className={inter.className}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
