#!/usr/bin/env python3

# This script build the samples and place the avpi file in ./build directory

# How to run
# "python3 build.py" - build all samples: 'basic-api', 'exportEDL', 'ExportFile', 'testdomain'
# "python3 build.py exportEDL" - build exportEDL sample only


import subprocess
import shutil
import glob
import os
import sys
import platform


# Define the project names
# projects = ['basic-api', 'exportEDL', 'ExportFile', 'configure-srt-plugin']
projects = ['basic-api', 'exportEDL', 'ExportFile', 'testdomain']


args = sys.argv
if len(args) > 1:
    if len(args) == 2: 
        if args[1] != "all":
            projects = []   
            projects.append(args[1])

print(os.getcwd())
os.makedirs('build', exist_ok=True)

# Build each project
for project in projects:
    # Navigate to the project folder
    # subprocess.run(['cd', project], shell=True)
    os.chdir(project)
    # Execute 'npm ci' command
    command = ['npm', 'ci']
    if platform.system() == 'Windows':
        command = ['npm.cmd', 'ci']
    subprocess.run(command)
    
    # Execute 'npm run build' command
    command = ['npm', 'run', 'package']
    if platform.system() == 'Windows':
        command = ['npm.cmd', 'run', 'package']
    subprocess.run(command)

    source_directory = os.path.join('dist', 'avpi')
    extension = '*.avpi'
    matching_files = glob.glob(os.path.join(source_directory, extension))
    
    for file_path in matching_files:
        file_name = os.path.basename(file_path)
        destination_directory = os.path.join('..' ,'build')

        os.makedirs(destination_directory, exist_ok=True)

        full_file_name = os.path.join(destination_directory, file_name) 
        # Copy the output to the root folder
        shutil.copy(file_path, full_file_name)

    # Navigate back to the root folder
    os.chdir('..')
