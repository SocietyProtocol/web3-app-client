"use client";

import {
  Box,
  Button,
  Link as MuiLink,
  Stack,
  Typography,
} from "@mui/material";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { useProfileId } from "@/data/users/useProfileId";
import { useCheckWrongNetwork } from "@/hooks/useCheckWrongNetwork";
import { useWagmiReady } from "@/atoms/wagmiReady";
import { ConnectButton } from "../Wallet/ConnectButton";
import { FeatureCard } from "./FeatureCard";
import { WelcomeCard } from "./WelcomeCard";
import { WhyNowCard } from "./WhyNowCard";
import { CommonQuestions } from "./CommonQuestions";

const CardIcon = ({ src, alt }: { src: string; alt: string }) => (
  <Image src={src} alt={alt} width={24} height={24} />
);

export const Home = () => {
  const router = useRouter();
  const wagmiReady = useWagmiReady();
  const { isConnected, address } = useAccount();
  const { isWrongNetwork } = useCheckWrongNetwork();
  const { data: profileId, isLoading: profileLoading } = useProfileId(address);

  const needsAccountSetup =
    wagmiReady &&
    isConnected &&
    !isWrongNetwork &&
    !profileLoading &&
    (profileId === undefined || profileId === BigInt(0));

  const needsConnect = wagmiReady && !isConnected;

  const identityHighlighted = needsConnect || needsAccountSetup;

  const handleClaimAccount = () => {
    router.push("/profile?setupOpen=true");
  };

  const identityActions = needsConnect ? (
    <ConnectButton variant="contained" fullWidth />
  ) : needsAccountSetup ? (
    <Button variant="contained" fullWidth onClick={handleClaimAccount}>
      Claim your account
    </Button>
  ) : (
    <Button
      variant="outlined"
      fullWidth
      onClick={() => router.push("/profile")}
    >
      Check your profile
    </Button>
  );

  return (
    <Box sx={{ pt: { xs: 6, md: 8 } }}>
      <Typography
        variant="h4"
        component="h1"
        sx={{
          color: "primary.main",
          fontSize: { xs: "2rem", sm: "2.5rem", md: "3rem" },
          lineHeight: 1.1,
          maxWidth: 980,
          mb: { xs: 4, md: 6 },
        }}
      >
        Your permanent place in the Society Protocol movement.
      </Typography>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            md: "minmax(0, 1fr) minmax(0, 1fr)",
          },
          gap: { xs: 4, md: 6 },
          alignItems: "start",
          mb: { xs: 6, md: 8 },
        }}
      >
        <WelcomeCard />

        <Stack spacing={2.5} sx={{ pt: { md: 1 } }}>
          <Typography
            sx={{
              color: "primary.main",
              fontFamily:
                "var(--font-pptelegraf), var(--font-space-grotesk), sans-serif",
              fontSize: "0.8125rem",
              letterSpacing: "0.15em",
              textTransform: "uppercase",
            }}
          >
            What is this?
          </Typography>
          <Typography
            sx={{
              color: "primary.main",
              fontSize: "1.0625rem",
              lineHeight: 1.6,
            }}
          >
            The Web3 Outpost is the first step.
          </Typography>
          <Typography
            sx={{
              color: "text.tertiary",
              fontSize: "1rem",
              lineHeight: 1.7,
            }}
          >
            Society Protocol is a long-term project — a new foundation for how
            humans coordinate, govern, and build together. It will take years to
            build. The people who show up now are the ones who will have shaped
            it.
          </Typography>
          <Typography
            sx={{
              color: "text.tertiary",
              fontSize: "1rem",
              lineHeight: 1.7,
            }}
          >
            This app is your entry point. Create an account, earn badges, and
            stake your place in the movement — before the world catches on.
          </Typography>
        </Stack>
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, minmax(0, 1fr))",
            lg: "repeat(3, minmax(0, 1fr))",
          },
          gap: { xs: 2.5, md: 3 },
        }}
      >
        <FeatureCard
          icon={<CardIcon src="/icons/profile.svg" alt="" />}
          title="Build your identity"
          description="Your account is a permanent, verifiable record of who you are and what you've contributed. It follows you as Society Protocol grows."
          highlighted={identityHighlighted}
          actions={identityActions}
        >
          {needsConnect && (
            <Stack
              direction="row"
              alignItems="center"
              spacing={1.25}
              sx={{ mt: 1.5 }}
            >
              <Image
                src="/icons/metamask.svg"
                alt="MetaMask"
                width={24}
                height={24}
              />
              <Typography
                sx={{
                  color: "text.tertiary",
                  fontSize: "0.8125rem",
                  lineHeight: 1.4,
                }}
              >
                You&apos;ll need a wallet. Install{" "}
                <MuiLink
                  href="https://metamask.io/download/"
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{
                    color: "inherit",
                    textDecoration: "underline",
                    fontStyle: "italic",
                  }}
                >
                  MetaMask
                </MuiLink>
                .
              </Typography>
            </Stack>
          )}
        </FeatureCard>

        <FeatureCard
          icon={<CardIcon src="/icons/badges.svg" alt="" />}
          title="Earn badges"
          description="Badges highlight your contributions and traits: Early adopter, ICO participant, Contributor, Governor. They aren't just for show; they represent real credentials as the platform evolves."
          actions={
            <Button
              variant="outlined"
              fullWidth
              onClick={() => router.push("/badges")}
            >
              Badges
            </Button>
          }
        />

        <FeatureCard
          icon={<CardIcon src="/icons/community.svg" alt="" />}
          title="Join communities"
          description="Find others building toward the same future. Communities on the Outpost are the early enclaves of a much larger world."
          actions={
            <Button
              variant="outlined"
              fullWidth
              onClick={() => router.push("/communities")}
            >
              Communities
            </Button>
          }
        />

        <FeatureCard
          icon={<CardIcon src="/icons/governance.svg" alt="" />}
          title="Govern the movement"
          description="Token holders with governor badges vote on how resources are allocated. This is a real say in a real direction."
          actions={
            <Button
              variant="outlined"
              fullWidth
              onClick={() => router.push("/governance")}
            >
              Snapshot
            </Button>
          }
        />

        <FeatureCard
          icon={<CardIcon src="/icons/auction.svg" alt="" />}
          title="Participate in the fundraise"
          description="The ICO funds the development of Society Protocol itself. Contributing now is how you stake your place in what gets built."
          actions={
            <Button
              variant="outlined"
              fullWidth
              onClick={() => router.push("/auction")}
            >
              Fundraiser
            </Button>
          }
        />

        <WhyNowCard />
      </Box>

      <CommonQuestions />
    </Box>
  );
};
