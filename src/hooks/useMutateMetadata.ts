import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { throwResponseError } from "@/utils/errors";
import { UploadMetadataResponse } from "@/app/api/upload-metadata/route";
import { useSnackbar } from "notistack";

interface UseMutateMetadataOptions {
  onError?: (error: unknown) => void;
  showNotifications?: boolean;
}

export const useMutateMetadata = ({
  onError,
  showNotifications = true,
}: UseMutateMetadataOptions = {}) => {
  const { generateAuthPayload } = useAuth();
  const { enqueueSnackbar, closeSnackbar } = useSnackbar();

  return useMutation<
    UploadMetadataResponse,
    Error,
    Record<string, unknown> | Record<string, unknown>[]
  >({
    mutationFn: async (data) => {
      const authPayload = await generateAuthPayload();

      const response = await fetch("/api/upload-metadata", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-auth-payload": JSON.stringify(authPayload),
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        await throwResponseError(response);
      }

      return response.json();
    },
    onMutate: showNotifications
      ? () => {
          enqueueSnackbar("Uploading metadata to IPFS...", {
            variant: "info",
            key: "ipfs-upload",
            persist: true,
          });
        }
      : undefined,
    onError: (error) => {
      if (showNotifications) {
        closeSnackbar("ipfs-upload");
      }
      onError?.(error);
    },
    onSuccess: showNotifications
      ? () => {
          closeSnackbar("ipfs-upload");
          enqueueSnackbar("Metadata uploaded to IPFS", {
            variant: "success",
            key: "ipfs-upload-success",
          });
        }
      : undefined,
  });
};
