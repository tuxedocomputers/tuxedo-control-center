#include "tuxedo_ec_io.h"

#define PORT_COMMAND        0x66
#define PORT_DATA           0x62

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

void write_command(uint8_t __cmd)
{
    outb(__cmd, PORT_COMMAND);
    while(inb(PORT_COMMAND) != 8);
}

void write_data(uint8_t __data)
{
    outb(__data, PORT_DATA);
}
