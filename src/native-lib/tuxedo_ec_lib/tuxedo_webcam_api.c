#include "tuxedo_webcam_api.h"

#define COMMAND_WEBCAM      0x9c

#define DATA_WEBCAM_ON      0x02
#define DATA_WEBCAM_OFF     0x82

static int webcam_set(uint8_t);

int webcam_on()
{
    return webcam_set(DATA_WEBCAM_ON);
}

int webcam_off()
{
    return webcam_set(DATA_WEBCAM_OFF);
}

static int webcam_set(uint8_t __data_webcam_status)
{
    if (__data_webcam_status != DATA_WEBCAM_ON && __data_webcam_status != DATA_WEBCAM_OFF) return EC_ERROR;

    if (!init_ports()) return EC_ERROR;

    if (!write_command(COMMAND_WEBCAM)) return EC_ERROR;
    if (!write_data(__data_webcam_status)) return EC_ERROR;
    
    if (!close_ports()) return EC_ERROR;

    return EC_SUCCESS;
}
