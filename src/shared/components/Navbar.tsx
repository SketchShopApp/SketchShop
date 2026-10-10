import Button from "./Button"
import { motion } from "motion/react"
import { AvatarCircle } from 'pixelarticons/react'
import logoLineSketch from "../../assets/logo-line-Sketch.svg"
import { useNavigate, useLocation, Link } from "react-router"

const NAV_ITEMS = [
  { label: "FILE", path: "/createfile" },
  { label: "EDIT", path: "/" },
  { label: "EXPORT", path: "/export" }
] as const


export default function Navbar() {
  const navigate = useNavigate()
  const location = useLocation()
  const activeTab = NAV_ITEMS.find(item => item.path === location.pathname)?.label || "FILE"

  return (
    <nav className="border-b border-white/10 bg-[#0b0b0b] px-6 py-5">
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        <div className="flex items-center gap-8">
          <Link to="/">
            <img src={logoLineSketch} alt="SketchShop" />
          </Link>

          <div className="flex items-center gap-3.5">
            {NAV_ITEMS.map((item) => {
              const isActive = activeTab === item.label

              return (
                <div className="relative" key={item.label}>
                  <Button
                    variant="ghost"
                    className={`rounded-none text-sm tracking-[0.12em] ${isActive ? "font-semibold text-white" : "text-gray-300"}`}
                    onClick={() => navigate(item.path)}
                    aria-pressed={isActive}
                  >
                    {item.label}
                  </Button>

                  {isActive ? (
                    <motion.span
                      className="absolute bottom-0 left-0 h-0.75 w-full bg-violet-500"
                      layoutId="active-nav-border"
                      transition={{ type: "spring", stiffness: 450, damping: 38 }}
                    />
                  ) : null}
                </div>
              )
            })}
          </div>
        </div>

        <div className="flex items-center gap-3.5">
          <AvatarCircle width={24} className="text-violet-500" />
          <svg width="20" height="20" viewBox="0 0 22 22" className="text-gray-300" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
          <path d="M3 19H6V17H10V20H12V17H16V19H14V22H8V19H6V21H1V16H3V19ZM21 21H16V19H19V16H21V21ZM5 10H2V12H5V16H3V14H0V8H3V6H5V10ZM19 8H22V14H19V16H17V12H20V10H17V6H19V8ZM13 15H9V13H13V15ZM9 13H7V9H9V13ZM15 13H13V9H15V13ZM13 9H9V7H13V9ZM6 3H3V6H1V1H6V3ZM14 3H16V1H21V6H19V3H16V5H12V2H10V5H6V3H8V0H14V3Z" fill="currentColor"/>
          </svg>

        </div>
      </div>
    </nav>
  )
}