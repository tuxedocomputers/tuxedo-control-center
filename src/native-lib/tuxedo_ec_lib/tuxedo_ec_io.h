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
 * Write given command to command port and wait until ready
 */
void write_command(uint8_t);

/**
 * Write given data to data port
 */
void write_data(uint8_t);

#ifdef __cplusplus
}
#endif

#endif
