export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="de">
      <body style={{ fontFamily: 'Arial', margin: 0 }}>{children}</body>
    </html>
  );
}
