import { redirect } from "next/navigation";
import WatchPageImpl from "./page.client";

interface PageProps {
  params: {
    roomName: string;
    name: string;
  };
}

export default async function WatchPage({ params: { roomName, name} }: PageProps) {
  console.log("roomName", roomName);
  console.log("name", name);
  if (!roomName) {
    redirect("/");
  }

  const serverUrl = process.env
    .LIVEKIT_WS_URL!.replace("wss://", "https://")
    .replace("ws://", "http://");

  return <WatchPageImpl roomName={roomName} serverUrl={serverUrl} name={name}/>;
}
