#ifndef TUXEDO_EC_IO_H
#define TUXEDO_EC_IO_H

#include <sys/io.h>
#include <stdint.h>

#ifdef __cplusplus
extern "C" {
#endif

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
int deinit_ports();

/**
 * Writes specified command code to the command port
 * 
 * 1. Waits until "ready to write" ie. the first bit is 1 (source: old ec_access.cc)
 * 2. Writes to the command port
 * 
 * Returns 0 if successful, -1 in case of timeout
 */
int write_command(uint8_t);

/**
 * Writes the specified data to the data port
 * 
 * 1. Waits until "command set" ie. the second bit is 1 (source: old ec_access.cc)
 * 2. Writes to the data port
 * 
 * Returns 0 if succesful, -1 in case of timeout
 */
int write_data(uint8_t);

#ifdef __cplusplus
}
#endif

#endif
