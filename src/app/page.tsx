import { HomeActions } from "@/components/home-actions";
import { Container, Flex, Kbd, Link, Separator, Text } from "@radix-ui/themes";
import Image from "next/image";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center gap-12 p-10 sm:p-24">
      <Container size="1">
        <Flex direction="column" align="center" gap="5">
          <Image
            src="/logo.png"
            alt="LiveKit"
            width="240"
            height="120"
            className="invert dark:invert-0 mt-8 mb-2"
          />
          <Text as="p">
            欢迎使用直播。您可以加入或开始您自己的流。
            {/*<Link href="https://livekit.io/cloud" target="_blank">*/}
            {/*  LiveKit Cloud*/}
            {/*</Link>*/}
            厌倦了当前的颜色主题？按{" "}
            <Kbd>⌘&thinsp;C</Kbd> 修改主题!
          </Text>
          <HomeActions />
          {/*<Separator orientation="horizontal" size="4" className="my-2" />*/}
          {/*<Text as="p" size="2">
            Feel free to clone this full-stack NextJS app{" "}
            <Link
              href="https://github.com/livekit-examples/livestream"
              target="_blank"
            >
              here
            </Link>
            .
             And also be sure to check out clone our{" "}
            <Link
              href="https://github.com/livekit-examples/swift-livestream"
              target="_blank"
            >
              iOS
            </Link>{" "}
            and <Link href="https://github.com/livekit-examples/android-livestream" target="_blank">Android</Link> clients, which are compatible with
            this web app!
          </Text>*/}
        </Flex>
      </Container>
    </main>
  );
}
