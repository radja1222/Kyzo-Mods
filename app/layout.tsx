import "./globals.css";
import { Header } from "@/components/Header";
export const metadata={title:"KyzoMods",description:"Premium GTA SA-MP & FiveM Mod Community"};
export default function RootLayout({children}:{children:React.ReactNode}){return <><Header/>{children}<footer className="footer"><div className="container footerGrid"><div><div className="logo"><span className="logoMark">K</span>KYZO<b>MODS</b></div><p>Community modding untuk SA-MP & FiveM.</p></div><div><strong>Explore</strong><a href="/mods?game=samp">SA-MP Mods</a><a href="/mods?game=fivem">FiveM Mods</a></div><div><strong>Creator</strong><a href="/upload">Upload Mod</a><a href="/dashboard">Dashboard</a></div></div></footer></>}
