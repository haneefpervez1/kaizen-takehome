import "./index.css";
import { SearchStateProvider } from "@/components/search/SearchStateContext";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <SearchStateProvider>{children}</SearchStateProvider>
      </body>
    </html>
  );
}
