#ifndef TUXEDO_IOCTL_H
#define TUXEDO_IOCTL_H

#define IOCTL_MAGIC 0xEC

#define MAGIC_READ  IOCTL_MAGIC
#define MAGIC_WRITE IOCTL_MAGIC+1

// Read defines
#define R_FANINFO_CPU   _IOR(MAGIC_READ, 0x01, int32_t*)
#define R_FANINFO_GPU1  _IOR(MAGIC_READ, 0x02, int32_t*)
#define R_FANINFO_GPU2  _IOR(MAGIC_READ, 0x03, int32_t*)

#define R_WEBCAM_SW     _IOR(MAGIC_READ, 0x04, int32_t*)
#define R_FLIGHTMODE_SW _IOR(MAGIC_READ, 0x05, int32_t*)
#define R_TOUCHPAD_SW   _IOR(MAGIC_READ, 0x06, int32_t*)

// Write defines
#define W_FANSPEED      _IOW(MAGIC_WRITE, 0x01, int32_t*)
#define W_FANAUTO       _IOW(MAGIC_WRITE, 0x02, int32_t*)

#define W_WEBCAM_SW     _IOW(MAGIC_WRITE, 0x03, int32_t*)
#define W_FLIGHTMODE_SW _IOW(MAGIC_WRITE, 0x04, int32_t*)
#define W_TOUCHPAD_SW   _IOW(MAGIC_WRITE, 0x05, int32_t*)

#endif
