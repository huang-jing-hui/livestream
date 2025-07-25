import WebRTCStreamer from "../../../components/WebRTCComponent";
import HostPageImpl from "./page.client";
interface PageProps {
  searchParams: {
    at: string | undefined;
    rt: string | undefined;
  };
}

export default async function HostPage() {

  return <HostPageImpl/>;
}
