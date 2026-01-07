import { ReactNode } from "react";
import {
  Box,
  CircularProgress,
  Stack,
  Stepper,
  Step,
  StepLabel,
  Typography,
} from "@mui/material";
import { ArrowConnector, CustomStepIcon, WizardButton } from "./styles";
import { useIsMobile } from "@/hooks/useIsMobile";

export interface WizardStep {
  label: string;
  description?: string;
}

interface WizardProps {
  title?: string;
  steps: WizardStep[];
  activeStep: number;
  children: ReactNode;
  onNext?: () => void;
  onBack?: () => void;
  onReset?: () => void;
  onFinish?: () => void;
  nextDisabled?: boolean;
  backDisabled?: boolean;
  finishDisabled?: boolean;
  showActions?: boolean;
  showReset?: boolean;
  minHeight?:
    | number
    | string
    | {
        xs?: number | string;
        sm?: number | string;
        md?: number | string;
        lg?: number | string;
      };
  isLoading?: boolean;
  loadingText?: string;
}

export const Wizard = ({
  title,
  steps,
  activeStep,
  children,
  onNext,
  onBack,
  onReset,
  onFinish,
  nextDisabled,
  backDisabled,
  finishDisabled,
  showActions = true,
  showReset = true,
  minHeight,
  isLoading = false,
  loadingText = "Saving...",
}: WizardProps) => {
  const isMobile = useIsMobile();

  return (
    <Box sx={{ width: "100%", maxWidth: 800 }}>
      {/* Title */}
      {title && (
        <Typography
          variant="h4"
          component="h1"
          sx={{
            mb: { xs: 3, sm: 5 },
            px: { xs: 1, sm: 2 },
          }}
        >
          {title}
        </Typography>
      )}

      {/* Step Indicators */}
      <Stepper
        activeStep={activeStep}
        connector={null}
        sx={{
          py: { xs: 1.5, sm: 2 },
          mb: { xs: 3, sm: 5 },
          px: { xs: 1, sm: 3 },
          overflowX: "auto",
        }}
      >
        {steps.flatMap((step, index) => {
          const isActive = index === activeStep;
          const isCompleted = index < activeStep;

          const stepElement = (
            <Step key={step.label} active={isActive} completed={isCompleted}>
              <StepLabel
                slots={{ stepIcon: CustomStepIcon }}
                slotProps={{
                  stepIcon: {
                    icon: index + 1,
                  },
                }}
                sx={{
                  "& .MuiStepLabel-label": {
                    fontSize: { xs: "0.75rem", sm: "1rem" },
                    fontWeight: 500,
                  },
                }}
              >
                {step.label}
              </StepLabel>
            </Step>
          );

          if (index < steps.length - 1 && !isMobile) {
            return [
              stepElement,
              <ArrowConnector
                key={`arrow-${index}`}
                active={index === activeStep - 1}
                completed={index < activeStep - 1}
              />,
            ];
          }

          return stepElement;
        })}
      </Stepper>

      {/* Step Content */}
      <Box
        sx={{
          p: { xs: 2, sm: 3, md: 4 },
          minHeight,
        }}
      >
        <Stack spacing={{ xs: 2, sm: 3 }}>
          {children}

          {/* Navigation Buttons */}
          {showActions && (
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={{ xs: 1, sm: 2 }}
              justifyContent="flex-start"
              sx={{ width: { xs: "100%", sm: "auto" } }}
            >
              {activeStep > 0 && (
                <WizardButton
                  variant="outlined"
                  onClick={onBack}
                  sx={{ width: { xs: "100%", sm: "auto" } }}
                  disabled={backDisabled || isLoading}
                >
                  Back
                </WizardButton>
              )}
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={{ xs: 1, sm: 2 }}
                sx={{ width: { xs: "100%", sm: "auto" } }}
              >
                {onReset && showReset && (
                  <WizardButton
                    variant="outlined"
                    onClick={onReset}
                    sx={{ width: { xs: "100%", sm: "auto" } }}
                  >
                    Reset
                  </WizardButton>
                )}
                {activeStep === steps.length - 1 ? (
                  <WizardButton
                    variant="contained"
                    onClick={onFinish || onReset}
                    disabled={isLoading || finishDisabled}
                    startIcon={
                      isLoading ? (
                        <CircularProgress size={16} color="inherit" />
                      ) : undefined
                    }
                    sx={{ width: { xs: "100%", sm: "auto" } }}
                  >
                    {isLoading ? loadingText : "Finish"}
                  </WizardButton>
                ) : (
                  <WizardButton
                    variant="contained"
                    onClick={onNext}
                    sx={{ width: { xs: "100%", sm: "auto" } }}
                    disabled={nextDisabled}
                  >
                    Next
                  </WizardButton>
                )}
              </Stack>
            </Stack>
          )}
        </Stack>
      </Box>
    </Box>
  );
};
