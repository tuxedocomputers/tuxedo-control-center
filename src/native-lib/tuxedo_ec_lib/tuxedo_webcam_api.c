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

static int webcam_set(uint8_t data_webcam)
{
    if (data_webcam != DATA_WEBCAM_ON && data_webcam != DATA_WEBCAM_OFF) return -1;

    int result;
    result = init_ports();
    if (result != 0) return result;

    result = write_command(COMMAND_WEBCAM);
    if (result != 0) return result;
    result = write_data(data_webcam);
    if (result != 0) return result;

    result = deinit_ports();
    if (result != 0) return result;

    return 0;
}
