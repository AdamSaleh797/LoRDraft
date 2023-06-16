import dev from 'server/config/dev.json'
import prod_ec2 from 'server/config/prod-ec2.json'
import prod from 'server/config/prod.json'

let g_config_builder
if (process.env.NODE_ENV === 'development') {
  g_config_builder = dev
} else if (process.env.ON_EC2 === '1') {
  g_config_builder = prod_ec2
} else {
  g_config_builder = prod
}

export const config = g_config_builder
