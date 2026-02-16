import { zodResolver } from "@hookform/resolvers/zod";
import {
  AutocompleteChangeReason,
  AutocompleteProps,
  Box,
  Button,
  Stack,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
import { SyntheticEvent, useCallback, useMemo, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import {
  UserAutocomplete,
  UserOption,
} from "../BadgeCreation/UserAutocomplete";
import DropArea from "../../DropArea/DropArea";
import { WithTooltip } from "../../WithTooltip/WithTooltip";
import { isAddress } from "viem";
import { uniq } from "@/utils/collection";
import { useMintBadgeMutation } from "./useMintBadgeMutation";
import { mintBadgeValidationSchema } from "./validation";
import { useQueryClient } from "@tanstack/react-query";
import { useBadge } from "@/data/badges/useBadge";
import { prop, toLowerCase } from "@/utils/curry";
import { useSnackbar } from "notistack";

enum MintMode {
  SINGLE = "single",
  BATCH = "batch",
}

interface MintTabProps {
  id: string;
}

export const MintTab = ({ id }: MintTabProps) => {
  const [mintMode, setMintMode] = useState<MintMode>(MintMode.SINGLE);
  const { enqueueSnackbar } = useSnackbar();
  const queryClient = useQueryClient();

  const { data } = useBadge(id);

  const holders = useMemo(
    () => data?.badge?.holders.map(toLowerCase(prop("id"))) || [],
    [data],
  );

  const form = useForm({
    resolver: zodResolver(mintBadgeValidationSchema),
    defaultValues: {
      recipients: [],
      file: undefined,
      fileContent: undefined,
    },
    mode: "onChange",
  });

  const [recipients, file, fileContent] = useWatch({
    control: form.control,
    name: ["recipients", "file", "fileContent"],
  });

  const handleToggleMintMode = useCallback(
    (event: React.SyntheticEvent, newValue: MintMode) => {
      setMintMode(newValue);

      form.reset();
    },
    [form],
  );

  const handleOnChangeSingle = useCallback(
    (
      _: SyntheticEvent<Element, Event>,
      newValue: string | null | UserOption,
    ) => {
      const newUserId = typeof newValue === "string" ? newValue : newValue?.id;

      if (newUserId && !isAddress(newUserId, { strict: false })) {
        enqueueSnackbar(`Invalid address (${newUserId})`, { variant: "error" });
        return;
      }

      if (newUserId && holders.includes(newUserId.toLowerCase())) {
        enqueueSnackbar(
          `User with address ${newUserId} already holds this badge`,
          {
            variant: "error",
          },
        );
        return;
      }

      form.setValue(
        "recipients",
        newValue ? [typeof newValue === "string" ? newValue : newValue.id] : [],
      );
    },
    [holders, form, enqueueSnackbar],
  );

  const handleOnChangeBatch = useCallback(
    (
      _: SyntheticEvent<Element, Event>,
      newValues: (string | UserOption)[],
      reason: AutocompleteChangeReason,
    ) => {
      const cleanNewValues = newValues.map((v) =>
        typeof v === "string" ? v : v.id,
      );

      if (reason === "clear" || reason === "removeOption") {
        form.setValue("recipients", cleanNewValues);
      } else if (
        reason === "createOption" ||
        reason === "blur" ||
        reason === "selectOption"
      ) {
        const invalidAddressIdx = newValues.findIndex(
          (v) => typeof v === "string" && !isAddress(v, { strict: false }),
        );

        if (invalidAddressIdx !== -1) {
          const invalidAddress = newValues[invalidAddressIdx];
          enqueueSnackbar(`Invalid address (${invalidAddress})`, {
            variant: "error",
          });
          return;
        }

        const holder = holders.find((h) =>
          cleanNewValues.some((v) => v.toLowerCase() === h),
        );

        if (holder) {
          enqueueSnackbar(
            `User with address ${holder} already holds this badge`,
            {
              variant: "error",
            },
          );
          return;
        }

        form.setValue("recipients", cleanNewValues);
      }
    },
    [enqueueSnackbar, form, holders],
  );

  const handleOnFile = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result;
        if (typeof text === "string") {
          form.setValue("fileContent", text, {
            shouldValidate: true,
          });

          const validAddresses = uniq(
            text
              .split(",")
              .map((line) => line.trim())
              .filter(
                (line) =>
                  isAddress(line, { strict: false }) &&
                  !holders.includes(line.toLowerCase()),
              ),
          );

          form.setValue("recipients", validAddresses, {
            shouldValidate: true,
          });
        }
      };
      reader.onerror = (e) => {
        console.error("Error reading file", e);
        enqueueSnackbar("Error reading file", { variant: "error" });
      };
      reader.readAsText(file);
      form.setValue("file", file, {
        shouldValidate: true,
      });
    },
    [enqueueSnackbar, form, holders],
  );

  const invalidAddresses = useMemo(() => {
    if (mintMode === MintMode.SINGLE) {
      return [];
    }

    const addresses = fileContent?.split(",").map((line) => line.trim()) ?? [];

    const invalids = uniq(
      addresses.filter(
        (line) =>
          line !== "" &&
          (!isAddress(line, { strict: false }) ||
            holders.includes(line.toLowerCase())),
      ),
    );

    return invalids;
  }, [fileContent, mintMode, holders]);

  const { mutate, transaction } = useMintBadgeMutation({
    onSuccess: () => {
      form.reset();
      Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["badge", id],
        }),

        queryClient.invalidateQueries({
          queryKey: ["user"],
        }),
      ]);
    },
  });

  const handleSubmit = form.handleSubmit((data) => {
    mutate({
      id: BigInt(id),
      recipients: data.recipients,
    });
  });

  return (
    <Stack
      marginTop={3}
      spacing={3}
      sx={{
        minHeight: 400,
      }}
    >
      <Tabs value={mintMode} onChange={handleToggleMintMode} className="pill">
        <Tab
          value={MintMode.SINGLE}
          label="Single"
          disableRipple
          disabled={transaction.isLoading}
        />
        <Tab
          value={MintMode.BATCH}
          label="Batch"
          disableRipple
          disabled={transaction.isLoading}
        />
      </Tabs>

      <Box>
        <WithTooltip
          variant="subtitle1"
          fontWeight={600}
          mb={0.5}
          tooltip={
            mintMode === MintMode.BATCH
              ? "Enter the addresses of the recipients who will receive the badges"
              : "Enter the address of the recipient who will receive the badge"
          }
        >
          {mintMode === MintMode.BATCH
            ? "Recipient Addresses"
            : "Recipient Address"}
        </WithTooltip>
        <Stack spacing={3}>
          {mintMode === MintMode.BATCH && recipients.length === 0 && (
            <Controller
              name="fileContent"
              control={form.control}
              render={({ fieldState }) => {
                return (
                  <>
                    <DropArea
                      disabled={transaction.isLoading}
                      error={fieldState.invalid}
                      helperText={fieldState.error?.message}
                      onFile={handleOnFile}
                      accept="text/csv, text/plain"
                      descriptionTop="Format: address1, address2, address3, ..."
                      descriptionBottom="CSV up to 2MB"
                    />
                    <Typography
                      color="primary.main"
                      textAlign="center"
                      sx={{
                        fontSize: 16,
                        mt: 2,
                      }}
                    >
                      OR
                    </Typography>
                  </>
                );
              }}
            />
          )}

          <UserAutocomplete
            multiple={mintMode === MintMode.BATCH}
            value={mintMode === "batch" ? recipients : recipients[0]}
            onChange={
              (mintMode === "batch"
                ? handleOnChangeBatch
                : handleOnChangeSingle) as AutocompleteProps<
                UserOption,
                boolean,
                false,
                true
              >["onChange"]
            }
            disabled={transaction.isLoading}
            excludeIds={holders}
          />
          {mintMode === "batch" &&
            file &&
            (recipients.length > 0 || invalidAddresses.length > 0) && (
              <Stack spacing={1}>
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <Typography color="text.primary">
                    Valid: {recipients.length}
                  </Typography>

                  <Typography color="text.primary">
                    Invalid: {invalidAddresses.length}
                  </Typography>

                  <Button
                    variant="text"
                    size="small"
                    onClick={() => form.reset()}
                    sx={{
                      color: (theme) => theme.palette.text.primary,
                      p: "0 !important",
                      textTransform: "none",
                      "&:hover": {
                        backgroundColor: "transparent",
                      },
                    }}
                    disabled={transaction.isLoading}
                  >
                    (Clear All)
                  </Button>
                </Stack>
                {invalidAddresses.length > 0 && (
                  <Box
                    sx={{
                      maxHeight: 150,
                      overflowY: "auto",
                      backgroundColor: (theme) =>
                        theme.palette.error.light + "22",
                      p: 1,
                      borderRadius: 1,
                    }}
                  >
                    {invalidAddresses.map((address, index) => (
                      <Typography
                        key={`${address}-${index}`}
                        color="error.main"
                        variant="body2"
                      >
                        &gt; {address}
                      </Typography>
                    ))}
                  </Box>
                )}
              </Stack>
            )}
        </Stack>
      </Box>
      <Box>
        <Button
          variant="outlined"
          disabled={
            !form.formState.isValid ||
            recipients.length === 0 ||
            transaction.isLoading
          }
          size="small"
          sx={{
            minWidth: 160,
          }}
          onClick={handleSubmit}
        >
          Mint Badge
        </Button>
      </Box>
    </Stack>
  );
};
