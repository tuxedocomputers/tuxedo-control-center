#include "tuxedo_ec_io.h"

#define PORT_COMMAND        0x66
#define PORT_DATA           0x62

#define TIMEOUT             1000000

static int set_port_perm(int __turn_on)
{
    int result_cmd = ioperm(PORT_COMMAND, 1, __turn_on);
    if (result_cmd != 0) return result_cmd;

    int result_data = ioperm(PORT_DATA, 1, __turn_on);
    if (result_data != 0) return result_data;

    return 0;
}

int init_ports()
{
    return set_port_perm(1);
}

int deinit_ports()
{
    return set_port_perm(0);
}

int write_command(uint8_t __cmd)
{
    int timeout;

    for(timeout = TIMEOUT; (inb(PORT_COMMAND) & 0x01) == 0 && timeout > 0; timeout--);
    if (timeout == 0) return -1;

    outb(__cmd, PORT_COMMAND);

    return 0;
}

int write_data(uint8_t __data)
{
    int timeout;

    for(timeout = TIMEOUT; inb(PORT_COMMAND & 0x02) != 0  && timeout > 0; timeout--);
    if (timeout == 0) return -1;

    outb(__data, PORT_DATA);

    return 0;
}
