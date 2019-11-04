#ifndef TUXEDO_EC_IO_H
#define TUXEDO_EC_IO_H

#include <sys/io.h>
#include <stdint.h>
#include <sched.h>

#ifdef __cplusplus
extern "C" {
#endif

#define COMMAND_READ_EC_REGISTERS   0x80
#define COMMAND_WRITE_EC_REGISTERS  0x81

#define EC_SUCCESS      1
#define EC_ERROR        0

/**
 * "Call Or Return" macro
 * If the expression fails, return failure
 */
#define CALL(expression)     if ((expression) != EC_SUCCESS) return EC_ERROR;

/**
 * Initialize ports by attempting to get port permissions
 * 
 * @returns 0 on success or ioperm return code on error
 */
int init_ports();

/**
 * Gives back permissions requested by init_ports()
 * 
 * @returns 0 on success or ioperm return code on error
 */
int close_ports();

/**
 * Writes specified command code to the command port
 * 
 * 1. Waits until command port signals "ready to write"
 * 2. Writes to the command port
 * 
 * Returns EC_SUCCESS if successful, EC_ERROR in case of timeout
 */
int write_command(uint8_t);

/**
 * Writes the specified data to the data port
 * 
 * 1. Waits until the command ports signals "ready to write"
 * 2. Writes to the data port
 * 
 * Returns EC_SUCCESS if succesful, EC_ERROR in case of timeout
 */
int write_data(uint8_t);

/**
 * Reads one byte from the data port
 * 
 * Returns the read value on success, -1 on failure
 */
int read_data_byte();

/**
 * Reads specified EC register
 * 
 * Returns the read value on success, -1 on failure
 */
int read_register_byte(uint8_t);

/**
 * Writes specified EC register
 * 
 * Returns EC_SUCCESS on success, otherwise EC_ERROR
 */
int write_register_byte(uint8_t, uint8_t);

#ifdef __cplusplus
}
#endif

#endif
