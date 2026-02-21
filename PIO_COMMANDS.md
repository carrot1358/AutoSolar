# PlatformIO Common Commands

## Build & Upload
```bash
pio run                                                    # build project
pio run --target upload                                    # build + upload to board
pio run --target upload --upload-port COM3                 # specify port
pio run --target clean                                     # clean build files
```

## Serial Monitor
```bash
pio device monitor                                         # open serial monitor
pio device monitor --baud 115200                           # specify baud rate
pio device monitor --port COM3                             # specify port
```

## Combined (upload then monitor)
```bash
pio run --target upload && pio device monitor
```

## Libraries
```bash
pio lib search "pubsubclient"                              # search for a library
pio lib install "knolleary/PubSubClient"                   # install manually
pio lib list                                               # list installed libraries
pio lib update                                             # update all libraries
```

## Device Info
```bash
pio device list                                            # list connected boards + COM ports
mode                                                       # list all active COM ports (Windows)
```

> Tip: run `pio device list` before and after plugging in your ESP32 to identify which COM port it uses.

## Project
```bash
pio init --ide vscode                                      # regenerate VS Code config
pio init --board esp32dev                                  # init new project for a board
pio boards | grep esp32                                    # search available board IDs
```

## Update PlatformIO
```bash
pio upgrade                                                # update PlatformIO core
pio update                                                 # update installed platforms + libraries
```

---

## Most Used (day-to-day)
```bash
pio run --target upload && pio device monitor
```
Builds, flashes, and opens the serial monitor in one command.
