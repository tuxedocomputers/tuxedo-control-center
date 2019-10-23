#include "tuxedo_ec_io.h"

#define PORT_COMMAND        0x66
#define PORT_DATA           0x62

#define TIMEOUT             1000000

static int set_port_perm(int);
static int wait_for_write(unsigned short);
static int wait_for_read(unsigned short);

int init_ports()
{
    return set_port_perm(1);
}

int close_ports()
{
    return set_port_perm(0);
}

int write_command(uint8_t __cmd)
{
    if (wait_for_write(PORT_COMMAND) == EC_ERROR) return EC_ERROR;
    outb(__cmd, PORT_COMMAND);
    return EC_SUCCESS;
}

int write_data(uint8_t __data)
{
    if (wait_for_write(PORT_COMMAND) == EC_ERROR) return EC_ERROR;
    outb(__data, PORT_DATA);
    return EC_SUCCESS;
}

static int set_port_perm(int __turn_on)
{
    int result_cmd = ioperm(PORT_COMMAND, 1, __turn_on);
    if (result_cmd != 0) return EC_ERROR;

    int result_data = ioperm(PORT_DATA, 1, __turn_on);
    if (result_data != 0) return EC_ERROR;

    return EC_SUCCESS;
}

static int wait_for_write(unsigned short __port)
{
    int timeout;
    for(timeout = TIMEOUT; (inb(__port) & 0x02) != 0 && timeout > 0; timeout--) sched_yield();
    if (timeout == 0) {
        return EC_ERROR;
    } else {
        return EC_SUCCESS;
    }
}

static int wait_for_read(unsigned short __port)
{
    int timeout;
    for(timeout = TIMEOUT; (inb(__port) & 0x01) == 0 && timeout > 0; timeout--) sched_yield();
    if (timeout == 0) {
        return EC_ERROR;
    } else {
        return EC_SUCCESS;
    }
}
