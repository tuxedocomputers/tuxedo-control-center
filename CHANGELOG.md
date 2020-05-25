# Changelog

## [Unreleased]
### Changed
- Default governor choice matched to the current cpufreq driver
  Results in better support for non-intel processors
- Make use of `scaling_available_frequencies` to limit choice (of frequencies)
- Change default profiles to take more dynamic values depending
  on available frequencies (minor differences to existing profiles)

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
