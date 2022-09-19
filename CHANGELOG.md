# Changelog

## [1.1.7] - 2022-09-19
### Added
- Basic support for Stellaris AMD Gen 4

## [1.1.6] - 2022-08-01

### Changed
- Packaging dependency tweaks (RPM) for wider compatibility

## [1.1.5] - 2022-07-15

### Added
- TUXEDO Aquaris control
  - Fan speed presets
  - Fan speed manual set (slider + input)
  - LED RGB color picker
  - LED static/rainbow mode picker
  - LED breath checkbox
  - Assign custom name to find device easier
  - Save/restore last used configuration
  - Links and notices to online instructions on how to use the device

## [1.1.4] - 2022-04-21
### Changed
- First steps of basic dependency/framework updates
  - Electron 13
  - Node 14
  - Angular 10

### Fixed
- Ubuntu 22.04 KDE with nvidia based systems sometimes refused to start TCC gui

## [1.1.3] - 2022-04-01

### Changed
- Dependencies on `libappindicator3-1` switched to `libayatana-appindicator3-1` (DEB + RPM)
- Alternative dependency on `libappindicator` for fedora (RPM)

### Fixed
- AMD boost max frequency workaround patched

## [1.1.2] - 2021-12-07

### Fixed
- Unable to assign profile to state on profile overview

## [1.1.1] - 2021-11-26

### Changed
- Updated packages/dependencies

### Fixed
- Crypt: Fix for inconsistent behaviour of listing/detecting encrypted drives
- Profile GUI input name related tweaks

## [1.1.0] - 2021-08-26
### Added
- Profiles: *System profile* selection for TCC profiles for certain devices (more to come).
  The system profiles usually affect power allowance and sometimes fan control when not
  using the TCC fan control.
- Profiles: Fan control parameter *Minimum fan speed* applied to existing fan curves.
- Profiles: Fan control parameter *Offset fan speed* applied to existing fan curves.
- Togglable visualization of fan curves.
- AMD (amdgpu): Chroma subsampling activation for external displays (experimental).
  Usable on many AMD CPU devices without discrete graphics card.
- Tray: Menu option to activate a profile temporarily.
- Tray: Menu option to toggle temporary powersave prevention.
- Tools: GUI for changing crypt password.
- Option to turn off TCC fan control in global settings.
- Option to turn off TCC CPU control in global settings.

### Changed
- TCC GUI title now using window manager default title.
- Better hiding of not available options for clarity both regarding
  available devices and features for these.
- Theme selection moved to settings.
- *Settings* button moved from tools to menu side.

### Fixed
- *Cool and breezy*/*Extreme powersave* profiles that in certain cases did not apply
  the CPU limits properly.
- Unreliable CPU info max freq for AMD devices sometimes yields max non boost freq
  sometimes boost freq and sometimes a seemingly random number depending on which
  kernel used around 5.11. Now changed to consistently use available freqs.

## [1.0.14] - 2021-05-20
### Added
- Systeminfo clarifications
  - Third clear *done* step when finished sending
  - Blurring while asking for password/working
  - Not possible to send again without going through *step 1*

### Fixed
- Systeminfo environmental variable passthrough
- Deb install message that looked like an error now hidden
- Adjust GUI window width/height if working screen area
  is found to be smaller than the default width/height
- Minimize icon size

## [1.0.13] - 2021-04-23
### Changed
- Max frequency for AMD CPUs clarified as 'boost' instead of max
  base frequency. Additionally now max frequency for these devices can be
  set to max base frequency with or without boost.
- Now using 'same speed' approach for fan control on all devices. This means
  that the same speed will be used for all fans. The speed written will be
  the highest decided from each individual sensor. This should better
  share the cooling between multiple fans where available.
- Fantables updated
  - Minimum 'on' fanspeeds now at 20% to make sure fans start better over all
  - Freezy fan profile now always on and even more freezy for those
    warm spring days

### Fixed
- Fan control for certain devices (like XP14 version without nvidia) where
  there is not one temp sensor per fan

## [1.0.12] - 2021-04-09
### Changed
- Default ODM perf. profile *performance* for some devices when returning fan control to the system

### Fixed
- *Shutdown timer* now uses standard `shutdown` functionality/logic
- Profile edit frequency slider missing update
- Profile overview selected profile update issue

## [1.0.11] - 2021-02-25
### Fixed
- More robust check for nvidia prime support
- Install autostart for new users (and in FAI)
- Fixed automatic restart after update having weird side effects,
  still needs one more (manual) restart of GUI before taking effect

## [1.0.9] - 2021-01-28
### Added
- Profile CPU setting "Maximum performance" now allows governor performance use

## [1.0.8] - 2020-12-11
### Changed
- Now uses interface from the `tuxedo-io` module in `tuxedo-keyboard` package instead of `tuxedo-cc-wmi`
- As of the transition to `tuxedo-io` newer devices like the *InfinityBook S 14 Gen6* are supported as well

### Fixed
- Fan control fail when tccd loads before kernel interface module
- Tray enable autostart when config folder is missing
- Writing to unwritable intel noTurbo parameter

## [1.0.7] - 2020-10-27
### Fixed
- Minor text adjustments
- RPM packaging, files conflicting with other packages

## [1.0.6] - 2020-10-08
### Changed
- Backlight brightness workarounds
  - Scaling fix for amdgpu bl
  - Tweak for slow driver loading or drivers that
    are not ready when presenting their interface

## [1.0.5] - 2020-09-29
### Added
- Fan control support for more devices with multiple fans (Polaris, Pulse)
- Added graphics selection (prime-select) tray options

## [1.0.4] - 2020-08-26
### Added
- New *Tools* area with shutdown timer feature
- Reintroducing state selection at profile edit
- Reintroducing profile copy

### Fixed
- Slightly changed behaviour of dashboard gauges to
  attempt to reduce CPU load
- Restart GUI when TCC is updated

## [1.0.3] - 2020-06-23
### Added
- Support for new devices
- Basic tray icon (optional autostart)
- Global keyboard shortcut (Tux+Alt+F6) to start

### Changed
- Revised fan tables for existing fan profiles
- New fan profile *Silent*
- New fan profile *Freezy*
- Cool & Breezy now uses the *Quiet* fan profile
- Powersave extreme now uses the *Silent* fan profile

## [1.0.2] - 2020-05-25
### Changed
- Default governor choice matched to the current cpufreq driver
  Results in better support for non-intel processors
- Make use of `scaling_available_frequencies` to limit choice (of frequencies)
- Change default profiles to take more dynamic values depending
  on available frequencies (minor differences to existing default profiles)

### Fixed
- State switching issue (failure to read power supply online value)
- AMD GPU backlight driver read brightness workaround

## [1.0.1] - 2020-04-16
### Fixed
- Read error for sysfs backlight path (when changed after tccd startup)

## [1.0.0] - 2020-04-08
### Added
- Packaging dependencies

### Changed
- Fix for visibility of GPU gauges on some models without GPU
- png -> svg icon for desktop/task bar

## [0.9.1] - 2020-03-30
### Changed
- Renaming adjustments of tuxedo-wmi -> tuxedo-cc-wmi

## [0.9.0] - 2020-03-26
### Added
- Systems availability checks
- Blending of features in backend on missing wmi control

### Changed
- Various size and theme color tweaks
- Fan control algorithm (added sensor input filtering)

### Fixed
- Inactive (but used) profile dot visibility
- Disable changing inactive profile options

## [0.8.2] - 2020-03-18
### Changed
- Tweaks and fixes for review

## [0.8.1] - 2020-03-17
### Changed
- Latest design adjustments

## [0.8.0] - 2020-03-06
### Added / Changed
- New control through tuxedo-wmi module
- Most of the new design implemented

## [0.7.4] - 2019-12-09
### Added
- Theme switching
- Light/dark theme for testing & toggling

## [0.7.3] - 2019-12-02
### Changed
- Preset profile changes
- Removed *Fast and furious*
- *Cool and breezy* now has all cores but disabled turbo
- *All cores powersave* is now *Powersave extreme*
    with minimum clock and disconnected webcam

### Fixed
- Package upgrade: RPM
- Package remove: Delete config files
- Package upgrade: Do not delete logs

## [0.7.0] - 2019-11-29
### Added
- Language support
- German translation
- Licencing GPLv3

### Changed
- Profile setting name change "No Turbo" changed to Turbo
- Various packaging tweaks

## [0.6.3] - 2019-11-18
### Fixed
- Temperature reporting

## [0.6.2] - 2019-11-18
### Added
- CPU dashboard
- DBus service and client

### Removed
- Old CPU settings

## [0.6.1] - 2019-11-08
### Fixed
- Changelog asset path

## [0.6.0] - 2019-11-08
### Added
- Basic fan control integration
- Slight fan control logic modification
- Fan profiles assignable to TCC profiles
- Info area with changelog and general app version information

## [0.5.3] - 2019-10-24
### Fixed
- Added missing enforcing of no_turbo setting

### Changed
- Phone number in support area

## [0.5.2] - 2019-10-23
### Changed
- Webcam control logic. Webcam control should now work more consistenly.
- CPU frequency settings will no longer be enforced when no_turbo is activated
  to prevent constant writing of settings.

## [0.5.1] - 2019-10-22
### Added
- Webcam status icon to profile overview tiles

### Changed
- Profile details true/false status strings to more meaningful values

## [0.5.0] - 2019-10-22
### Added
- USB devices controller (logic only)
- Profile manager -> profiles overview tiles
- Profile overview button
- Profile filter on All, Preset, Default and In use
- Profile name input box on details page (activated for custom profiles)
- Webcam control (on / off) from profiles

### Changed
- Profile manager selected (viewed) profile is now mainly changed through clicking the
  overview tiles. Selected profile can be deselected via "profile overview" button.
- Main nav "active profile" entry now links to the profile overview tiles
- Profile save moved to profile manager toolbar
- Profile state choices moved away from profile manager toolbar to profile details
  similar to the profile overview tiles
- Profile save now saves chosen state (multiple possible) as well
- Profile save now saves profile name as well

## [0.4.0] - 2019-09-20
### Added
- State logic to daemon and GUI.
- Current states are 'Mains powered' and 'Battery powered'
- Buttons for assigning a profile to a state in profile manager

### Changed
- Single active profile setting changed to one active profile per state
- Profile dropdown moved to profile manager
- Buttons refreshed and labels replaced with icons in profile manager

### Removed
- Activate single state button

## [0.3.1] - 2019-09-18
### Added
- FEATURES.md aka general feature list
- CHANGELOG.md Basic changelog from start of versioning
- Icon to main nav exit option
- 'Discard' button for CPU profile edit

### Changed
- Current CPU frequency values are now periodically checked with active profile and rewritten if found not to be the same.
- 'Save' button on CPU profile edit relocated

## [0.3.0] - 2019-09-11
### Added
- Support feature
- systeminfos.sh download and run functionality to support area
- Anydesk install from repo and run functionality to support area
- Icons to support feature
- Icons to the main navigation

## [0.2.1] - 2019-09-05
### Added
- Fallback for displayed brightness value change. Now reads from sysfs when known dbus is not available.
- More info about backlight driver and used dbus interface

### Changed
- Application of new CPU frequency profile now sets default values for all parameters first. Then applies parameters to all cores while all cores are still online. Then disables any cores.

## [0.2.0] - 2019-09-03
### Added
- GUI for display brightness
- Functionality for tracking and controlling current brightness thorugh dbus (in GUI, for gnome only)
- Edit custom profile display brightness settings

### Changed
- Tweaks to profile manager buttons
- ESC to cancel profile name input
- More responsive update of CPU min/max frequency slider values

### Fixed
- Now disallows deleting the last custom profile to prevent emtpy custom profile list

## [0.1.2] - 2019-08-29
### Changed
- Modifications to nav menu
- Tweaks to profile-manager buttons

## [0.1.1] - 2019-08-29
### Changed
- Replace 'default' strings for default profile values with machine specific values
- Visual adjustments to cpu-settings
- Modified current editing profile logic
- Adjusted profile manager buttons

## [0.1.0] - 2019-08-28
### Added
- Profile manager feature
- Basic rename profile functionality

## [0.0.2] - 2019-08-26
### Added
- CPU frequency feature
- Editing CPU frequency features for custom profiles
- Viewing configured and "live" info from cores
- Comparing default profiles
- Basic tuxedo theme css template

## [0.0.1] - 2019-08-29
### Added
- Versioning (start of dev test versions)
- Basically start of the GUI with basic CPU frequency list for cores and Angular material framework

### Implementation before versioning
- Daemon
- Project structure
- Development features
- Etc.
