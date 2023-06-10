import dev from 'server/config/dev.json'
import prod_ec2 from 'server/config/prod-ec2.json'
import prod from 'server/config/prod.json'

let config_builder
if (process.env.NODE_ENV === 'development') {
  config_builder = dev
} else if (process.env.ON_EC2 === '1') {
  config_builder = prod_ec2
} else {
  config_builder = prod
}

export const config = config_builder
