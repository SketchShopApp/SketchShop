import Navbar from "../shared/components/Navbar"
import PinZoomPinch from "./PinZoomPinch"
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts"
import ChatPanel from "../features/ai-chat/ChatPanel";

export default function Workshop() {
  useKeyboardShortcuts();

  return (
    <div className="flex flex-col h-dvh">
      <Navbar />
      <PinZoomPinch />
      <ChatPanel />
    </div>
  )
}