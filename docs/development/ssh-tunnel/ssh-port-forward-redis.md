# SSH port forward to access resources in VPC

## Steps

1. [Install the Session Manager plugin for the AWS CLI](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-working-with-install-plugin.html)

1. Copy [aws-ssm-ec2-proxy-command.sh](./aws-ssm-ec2-proxy-command.sh) to your `~/.ssh/` folder

1. Add the following SSH config entry to your `~/.ssh/config`:

    ```
    Host bastionfw
        User ec2-user
        IdentityFile ~/.ssh/id_rsa
        ProxyCommand ~/.ssh/aws-ssm-ec2-proxy-command.sh hyperlocalAdmin ap-southeast-1 ec2-user 22 ~/.ssh/id_rsa.pub
        StrictHostKeyChecking no
        LocalForward 9090 devproto-live-data.xxxxxx.0001.apse1.cache.amazonaws.com:6379
        #             /\                           /\                               /\
        #             ||                           ||                               ||
        #             \/                           \/                               \/
        #         local port            redis cluster primary endpoint      redis cluster port
    ```

1. Open a tunnel with port forwarding: `ssh -f -N bastionfw`

1. Open a redis client: `npx redis-commander --redis-host 127.0.0.1 --redis-port 9090`

## Resources

* https://github.com/qoomon/aws-ssm-ec2-proxy-command

