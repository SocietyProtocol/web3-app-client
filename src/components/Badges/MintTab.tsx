import { addressValidationSchema } from "@/validation/address";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AutocompleteProps,
  Box,
  Stack,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
import { SyntheticEvent, useCallback, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import z from "zod";
import { UserAutocomplete, UserOption } from "./BadgeCreation/UserAutocomplete";
import DropArea from "../DropArea/DropArea";
import { WithTooltip } from "../WithTooltip/WithTooltip";
import { isAddress } from "viem";

export const MintTab = () => {
  const [value, setValue] = useState<string | false>("single");
  const [file, setFile] = useState<File | null>(null);

  const form = useForm({
    resolver: zodResolver(
      z.object({
        recipients: z
          .array(addressValidationSchema)
          .min(1, "At least one recipient is required"),
      }),
    ),
    defaultValues: {
      recipients: [],
    },
    mode: "onChange",
  });

  const recipients = useWatch({ control: form.control, name: "recipients" });

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

      form.setValue("recipients", []);
      setFile(null);
    },
    [form],
  );

  const handleOnFile = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result;
        if (typeof text === "string") {
          const lines = text.split(/\r?\n/);
          const addresses = lines
            .map((line) => line.trim())
            .filter((line) => isAddress(line, { strict: false })); // filter out invalid addresses

          form.setValue("recipients", addresses);
        }
      };
      reader.readAsText(file);
      setFile(file);
    },
    [form],
  );

  return (
    <Stack marginTop={3} spacing={3}>
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
          {value === "batch" && file === null && (
            <>
              <DropArea onFile={handleOnFile} />

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
        </Stack>
      </Box>
    </Stack>
  );
};
