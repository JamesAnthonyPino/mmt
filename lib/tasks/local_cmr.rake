require 'cmr/load_data.rb'

namespace :cmr do
  include Cmr

  desc 'Load collection metadata into locally running CMR'
  task load: [:reset] do
    cmr = Cmr::Local.new(50) # might not actually add 50 collections, there are some errors
    # TODO find a set of good collection metadata to load
    cmr.load_data
  end

  desc 'Start local CMR'
  task start: [:stop] do
    Process.spawn('cd cmr; java -classpath ./cmr-dev-system-0.1.0-SNAPSHOT-standalone.jar cmr.dev_system.runner > cmr_logs.log &')
    puts 'Cmr is starting up'
    puts 'You will see some log4j warning messages, wait about 20 seconds then press enter to get a prompt back'
  end

  desc 'Reset data in CMR'
  task :reset do
    cmr = Cmr::Local.new
    cmr.reset_data
  end

  desc 'Start and load data into local CMR'
  task start_and_load: [:start, :load] do
    # Start CMR and load data
  end

  desc 'Stop local CMR process'
  task :stop do
    `kill $(ps aux | grep '[c]mr-dev-system' | awk '{print $2}')`
  end

  desc 'Delete provider used in tests'
  task reset_test_provider: ['tmp:cache:clear'] do
    cmr = Cmr::Local.new
    cmr.reset_provider('MMT_2')
  end
end