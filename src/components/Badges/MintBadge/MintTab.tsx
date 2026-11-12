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
} from "../../User/UserAutocomplete/UserAutocomplete";
import DropArea from "../../DropArea/DropArea";
import { WithTooltip } from "../../WithTooltip/WithTooltip";
import { isAddress, Hex, Address } from "viem";
import { uniq } from "@/utils/collection";
import { mintBadgeValidationSchema } from "./validation";
import { TransactionButton } from "@/components/Transaction/TransactionButton";
import { useBadge } from "@/data/badges/useBadge";
import { prop, toLowerCase } from "@/utils/curry";
import { useSnackbar } from "notistack";
import { useMintBadgeMutation } from "./useMintBadgeMutation";
import { SimulationError } from "@/components/Transaction/SimulationError";
import { useLegacyAccounts } from "@/components/shared/useLegacyAccounts";
import { replaceRecipient } from "@/components/shared/legacyAccounts";
import {
  MappedRecipient,
  RecipientAddressHints,
} from "@/components/shared/RecipientAddressHints";

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
  const legacy = useLegacyAccounts();
  // Legacy wallets replaced by their Society address, for the inline notice.
  const [mapped, setMapped] = useState<MappedRecipient[]>([]);

  const { data } = useBadge(id);

  const holders = useMemo(
    () => data?.badge?.holders.map(toLowerCase(prop("id"))) || [],
    [data],
  );

  const filterOptions = useCallback(
    (options: UserOption[]) => {
      const filtered = options.filter(
        (option) => !holders.includes(option.id.toLowerCase()),
      );

      return filtered;
    },
    [holders],
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

  const resetForm = useCallback(() => {
    form.reset();
    setMapped([]);
  }, [form]);

  const handleToggleMintMode = useCallback(
    (event: React.SyntheticEvent, newValue: MintMode) => {
      setMintMode(newValue);

      resetForm();
    },
    [resetForm],
  );

  const handleOnChangeSingle = useCallback(
    (
      _: SyntheticEvent<Element, Event>,
      newValue: string | null | UserOption,
    ) => {
      const rawUserId = typeof newValue === "string" ? newValue : newValue?.id;
      const resolved = rawUserId
        ? legacy.resolveRecipient(rawUserId)
        : undefined;
      const newUserId = resolved?.address;

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

      setMapped(
        resolved?.mappedFrom
          ? [{ from: resolved.mappedFrom, to: resolved.address as Address }]
          : [],
      );
      form.setValue("recipients", newUserId ? [newUserId] : [], {
        shouldValidate: true,
      });
    },
    [holders, form, enqueueSnackbar, legacy],
  );

  const handleOnChangeBatch = useCallback(
    (
      _: SyntheticEvent<Element, Event>,
      newValues: (string | UserOption)[],
      reason: AutocompleteChangeReason,
    ) => {
      const resolved = legacy.resolveRecipients(
        newValues.map((v) => (typeof v === "string" ? v : v.id)),
      );
      const cleanNewValues = resolved.addresses;

      if (
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
      }

      setMapped((prev) => [
        ...prev.filter((m) => !resolved.mapped.some((n) => n.to === m.to)),
        ...resolved.mapped,
      ]);
      form.setValue("recipients", cleanNewValues, { shouldValidate: true });
    },
    [enqueueSnackbar, form, holders, legacy],
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

          const resolved = legacy.resolveRecipients(
            text
              .split(",")
              .map((line) => line.trim())
              .filter((line) => isAddress(line, { strict: false })),
          );
          const validAddresses = resolved.addresses.filter(
            (address) => !holders.includes(address.toLowerCase()),
          );

          setMapped(resolved.mapped);
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
    [enqueueSnackbar, form, holders, legacy],
  );

  const handleReplaceRecipient = useCallback(
    (from: string, to: Address) => {
      if (holders.includes(to.toLowerCase())) {
        enqueueSnackbar(`User with address ${to} already holds this badge`, {
          variant: "error",
        });
        return;
      }

      form.setValue("recipients", replaceRecipient(recipients, from, to), {
        shouldValidate: true,
      });
    },
    [enqueueSnackbar, form, holders, recipients],
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
            holders.includes(
              legacy.resolveRecipient(line).address.toLowerCase(),
            )),
      ),
    );

    return invalids;
  }, [fileContent, mintMode, holders, legacy]);

  const transaction = useMintBadgeMutation({
    args:
      recipients.length > 0 &&
      form.formState.isValid &&
      recipients.every((r) => isAddress(r, { strict: false }))
        ? { id: BigInt(id), recipients: recipients as Hex[] }
        : undefined,
    onSuccess: resetForm,
  });

  const handleSubmit = form.handleSubmit(() => transaction.execute());

  return (
    <Stack marginTop={3} spacing={3} sx={{ minHeight: 200 }}>
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
            freeSolo
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
            filterOptions={filterOptions}
          />
          <RecipientAddressHints
            addresses={recipients}
            mapped={mapped}
            onReplace={handleReplaceRecipient}
            disabled={transaction.isLoading}
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
                    onClick={resetForm}
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

      <SimulationError error={transaction.simulation.error} />

      <Box>
        <TransactionButton
          variant="outlined"
          disabled={
            !form.formState.isValid ||
            recipients.length === 0 ||
            transaction.simulation.isFetching ||
            transaction.simulation.isError
          }
          size="small"
          sx={{ minWidth: 160 }}
          onClick={handleSubmit}
          simulating={transaction.simulation.isFetching}
          loading={transaction.isLoading}
          loadingText="Minting..."
          gas={transaction.gas}
          gasLoading={transaction.gasLoading}
          gasError={transaction.gasError}
        >
          Mint Badge
        </TransactionButton>
      </Box>
    </Stack>
  );
};
