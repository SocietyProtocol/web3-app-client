import { addressValidationSchema } from "@/validation/address";
import { zodResolver } from "@hookform/resolvers/zod";
import {
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
import z from "zod";
import { UserAutocomplete, UserOption } from "./BadgeCreation/UserAutocomplete";
import DropArea from "../DropArea/DropArea";
import { WithTooltip } from "../WithTooltip/WithTooltip";
import { isAddress } from "viem";
import { uniq } from "@/utils/collection";

const validationSchema = z.object({
  recipients: z
    .array(addressValidationSchema)
    .min(1, "At least one recipient is required"),
  file: z
    .instanceof(File)
    .refine(
      (file) => file.size <= 2 * 1024 * 1024,
      "File must be less than 2MB",
    )
    .optional(),
  fileContent: z
    .string()
    .refine(
      (content) => {
        const addresses = content.split(",");

        return (
          addresses.length > 0 &&
          addresses.some((line) => isAddress(line.trim(), { strict: false }))
        );
      },
      {
        message: "File must contain valid addresses, separated by commas",
      },
    )
    .optional()
    .transform((value) => {
      if (!value) return undefined;
      const lines = value.split(",");
      const addresses = lines.map((line) => line.trim());

      return addresses.length > 0 ? addresses : undefined; // treat empty array as undefined
    }),
});

export const MintTab = () => {
  const [value, setValue] = useState<string | false>("single");

  const form = useForm({
    resolver: zodResolver(validationSchema),
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

  const handleOnChangeSingle = useCallback(
    (
      event: SyntheticEvent<Element, Event>,
      newValue: string | null | UserOption,
    ) => {
      form.setValue(
        "recipients",
        newValue ? [typeof newValue === "string" ? newValue : newValue.id] : [],
      );
    },
    [form],
  );

  const handleOnChangeBatch = useCallback(
    (
      event: SyntheticEvent<Element, Event>,
      newValues: (string | UserOption)[],
    ) => {
      form.setValue(
        "recipients",
        newValues.map((value) =>
          typeof value === "string" ? value : value.id,
        ),
      );
    },
    [form],
  );

  const handleToggleTab = useCallback(
    (event: React.SyntheticEvent, newValue: string) => {
      setValue(newValue);

      form.reset();
    },
    [form],
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
              .filter((line) => isAddress(line, { strict: false })),
          );

          form.setValue("recipients", validAddresses, {
            shouldValidate: true,
          });
        }
      };
      reader.readAsText(file);
      form.setValue("file", file, {
        shouldValidate: true,
      });
    },
    [form],
  );

  const invalidAddresses = useMemo(() => {
    if (value === "single") {
      return [0, 0];
    }

    const adresses = fileContent?.split(",").map((line) => line.trim()) ?? [];
    const invalids = uniq(
      adresses.filter(
        (line) => line !== "" && !isAddress(line, { strict: false }),
      ),
    );

    return invalids;
  }, [fileContent, value]);

  return (
    <Stack
      marginTop={3}
      spacing={3}
      sx={{
        minHeight: 400,
      }}
    >
      <Tabs value={value} onChange={handleToggleTab} className="pill">
        <Tab value="single" label="Single" disableRipple />
        <Tab value="batch" label="Batch" disableRipple />
      </Tabs>

      <Box>
        <WithTooltip
          variant="subtitle1"
          fontWeight={600}
          mb={0.5}
          tooltip={
            value === "batch"
              ? "Enter the addresses of the recipients who will receive the badges"
              : "Enter the address of the recipient who will receive the badge"
          }
        >
          {value === "batch" ? "Recipient Addresses" : "Recipient Address"}
        </WithTooltip>
        <Stack spacing={3}>
          {value === "batch" && recipients.length === 0 && (
            <Controller
              name="fileContent"
              control={form.control}
              render={({ field, fieldState }) => {
                if (field.value !== undefined && !fieldState.invalid) {
                  return <></>;
                }

                return (
                  <>
                    <DropArea
                      {...field}
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
            multiple={value === "batch"}
            value={value === "batch" ? recipients : recipients[0]}
            onChange={
              (value === "batch"
                ? handleOnChangeBatch
                : handleOnChangeSingle) as AutocompleteProps<
                UserOption,
                boolean,
                false,
                true
              >["onChange"]
            }
          />
          {value === "batch" && file && recipients.length > 0 && (
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
                    <Typography key={index} color="error.main" variant="body2">
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
          disabled={!form.formState.isValid || recipients.length === 0}
          size="small"
          sx={{
            minWidth: 160,
          }}
        >
          Mint Badge
        </Button>
      </Box>
    </Stack>
  );
};
