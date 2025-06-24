import { redirect } from "next/navigation";
import WatchPageImpl from "./page.client";

interface PageProps {
  params: {
    roomName: string;
  };
}

export default async function WatchPage({ params: { roomName } }: PageProps) {
  if (!roomName) {
    redirect("/");
  }

  const serverUrl = process.env
    .LIVEKIT_WS_URL!.replace("wss://", "https://")
    .replace("ws://", "http://");
  const imServerUrl = process.env.NEXT_PUBLIC_IM_SERVER_URL!;
  return <WatchPageImpl roomName={roomName} serverUrl={serverUrl} imServerUrl={imServerUrl} />;
}
