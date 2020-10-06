/*!
 * Copyright (c) 2019-2020 TUXEDO Computers GmbH <tux@tuxedocomputers.com>
 *
 * This file is part of tuxedo-cc-wmi.
 *
 * tuxedo-cc-wmi is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This software is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this software.  If not, see <https://www.gnu.org/licenses/>.
 */
#ifndef TUXEDO_IOCTL_H
#define TUXEDO_IOCTL_H

#define IOCTL_MAGIC 0xEC

#define MAGIC_READ_CL   IOCTL_MAGIC
#define MAGIC_WRITE_CL  IOCTL_MAGIC + 1

#define MAGIC_READ_UW   IOCTL_MAGIC + 2
#define MAGIC_WRITE_UW  IOCTL_MAGIC + 3


// General
#define R_MOD_VERSION   _IOR(IOCTL_MAGIC, 0x00, char*)

#define R_HWCHECK_CL    _IOR(IOCTL_MAGIC, 0x05, char*)
#define R_HWCHECK_UW    _IOR(IOCTL_MAGIC, 0x06, char*)

/**
 * Clevo interface
 */

// Read
#define R_FANINFO1      _IOR(MAGIC_READ_CL, 0x10, int32_t*)
#define R_FANINFO2      _IOR(MAGIC_READ_CL, 0x11, int32_t*)
#define R_FANINFO3      _IOR(MAGIC_READ_CL, 0x12, int32_t*)
// #define R_FANINFO4      _IOR(MAGIC_READ_CL, 0x04, int32_t*)

#define R_WEBCAM_SW     _IOR(MAGIC_READ_CL, 0x13, int32_t*)
#define R_FLIGHTMODE_SW _IOR(MAGIC_READ_CL, 0x14, int32_t*)
#define R_TOUCHPAD_SW   _IOR(MAGIC_READ_CL, 0x15, int32_t*)

#ifdef DEBUG
#define R_TF_BC         _IOW(MAGIC_READ_CL, 0x91, uint32_t*)
#endif

// Write
#define W_FANSPEED      _IOW(MAGIC_WRITE_CL, 0x10, int32_t*)
#define W_FANAUTO       _IOW(MAGIC_WRITE_CL, 0x11, int32_t*)

#define W_WEBCAM_SW     _IOW(MAGIC_WRITE_CL, 0x12, int32_t*)
#define W_FLIGHTMODE_SW _IOW(MAGIC_WRITE_CL, 0x13, int32_t*)
#define W_TOUCHPAD_SW   _IOW(MAGIC_WRITE_CL, 0x14, int32_t*)

#ifdef DEBUG
#define W_TF_BC         _IOW(MAGIC_WRITE_CL, 0x91, uint32_t*)
#endif

/**
 * Uniwill interface
 */

// Read
#define R_UW_FANSPEED       _IOR(MAGIC_READ_UW, 0x10, int32_t*)
#define R_UW_FANSPEED2      _IOR(MAGIC_READ_UW, 0x11, int32_t*)
#define R_UW_FAN_TEMP       _IOR(MAGIC_READ_UW, 0x12, int32_t*)
#define R_UW_FAN_TEMP2      _IOR(MAGIC_READ_UW, 0x13, int32_t*)

#define R_UW_MODE           _IOR(MAGIC_READ_UW, 0x14, int32_t*)
#define R_UW_MODE_ENABLE    _IOR(MAGIC_READ_UW, 0x15, int32_t*)

// Write
#define W_UW_FANSPEED       _IOW(MAGIC_WRITE_UW, 0x10, int32_t*)
#define W_UW_FANSPEED2      _IOW(MAGIC_WRITE_UW, 0x11, int32_t*)
#define W_UW_MODE           _IOW(MAGIC_WRITE_UW, 0x12, int32_t*)
#define W_UW_MODE_ENABLE    _IOW(MAGIC_WRITE_UW, 0x13, int32_t*)

#endif
