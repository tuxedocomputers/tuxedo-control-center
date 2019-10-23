#ifndef TUXEDO_EC_IO_H
#define TUXEDO_EC_IO_H

#include <sys/io.h>
#include <stdint.h>
#include <sched.h>

#ifdef __cplusplus
extern "C" {
#endif

#define EC_SUCCESS      1
#define EC_ERROR        0

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

#ifdef __cplusplus
}
#endif

#endif
