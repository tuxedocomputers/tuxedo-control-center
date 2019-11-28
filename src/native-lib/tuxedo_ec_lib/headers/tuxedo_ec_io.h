/*!
 * Copyright (c) 2019 TUXEDO Computers GmbH <tux@tuxedocomputers.com>
 *
 * This file is part of TUXEDO Control Center.
 *
 * TUXEDO Control Center is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * TUXEDO Control Center is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with TUXEDO Control Center.  If not, see <https://www.gnu.org/licenses/>.
 */
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
