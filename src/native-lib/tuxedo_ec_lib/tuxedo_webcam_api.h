#ifndef TUXEDO_WEBCAM_API
#define TUXEDO_WEBCAM_API

#include "tuxedo_ec_io.h"

#ifdef __cplusplus
extern "C" {
#endif

/**
 * Virtually connect webcam
 */
int webcam_on();

/**
 * Virtually disconnect webcam
 */
int webcam_off();

#ifdef __cplusplus
}
#endif

#endif
