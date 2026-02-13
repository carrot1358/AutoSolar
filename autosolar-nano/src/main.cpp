#include <Arduino.h>

#define sw1 7

#define RPWM_Output 5
#define LPWM_Output 6

#define Lamp_Green 2
#define Lamp_Red 3

// Mode variables
int currentMode = 1;        // Current mode (1 or 2)
bool buttonPressed = false; // Track button state
bool lastButtonState = false; // Previous button state
unsigned long lastDebounceTime = 0; // Debounce timing
unsigned long debounceDelay = 50; // Debounce delay

// Function prototypes
void autoMode();
void manualMode();

void setup() {
  pinMode(LED_BUILTIN, OUTPUT); // Initialize the built-in LED pin as output
  pinMode(sw1, INPUT_PULLUP);   // Initialize pin 7 as input with pullup resistor

  pinMode(Lamp_Green, OUTPUT);
  pinMode(Lamp_Red, OUTPUT);

  pinMode(RPWM_Output, OUTPUT);
  pinMode(LPWM_Output, OUTPUT);

  digitalWrite(Lamp_Green, LOW);
  digitalWrite(Lamp_Red, LOW);

  Serial.begin(9600); // Start serial communication at 9600 baud rate
}

void checkButton() {
  bool currentButtonState = !digitalRead(sw1); // Inverted because of pullup
  unsigned long currentTime = millis();

  // Debounce check
  if (currentButtonState != lastButtonState) {
    lastDebounceTime = currentTime;
  }

  if ((currentTime - lastDebounceTime) > debounceDelay) {
    // Button just pressed
    if (currentButtonState && !buttonPressed) {
      buttonPressed = true;
    }

    // Button just released
    if (!currentButtonState && buttonPressed) {
      // Toggle between mode 1 and 2
      if (currentMode == 1) {
        currentMode = 2;
      } else {
        currentMode = 1;
      }
      Serial.print("Mode ");
      Serial.println(currentMode);
      buttonPressed = false;
    }
  }

  lastButtonState = currentButtonState;
}

void executeMode() {
  switch (currentMode) {
    case 1:
      autoMode();
      break;

    case 2:
      manualMode();
      break;
  }
}

void loop() {
  checkButton();
  executeMode();
}
