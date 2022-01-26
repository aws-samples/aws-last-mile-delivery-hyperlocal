# SSH Tunneling through a Bastion server to access resources in VPC

## Steps

1. [Install the Session Manager plugin for the AWS CLI](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-working-with-install-plugin.html)

1. Copy [aws-ssm-ec2-proxy-command.sh](./aws-ssm-ec2-proxy-command.sh) to your `~/.ssh/` folder

1. Add the following SSH config entry to your `~/.ssh/config`:

    ```
    Host bastion
        User ec2-user
        IdentityFile ~/.ssh/id_rsa
        ProxyCommand ~/.ssh/aws-ssm-ec2-proxy-command.sh hyperlocalAdmin ap-southeast-1 ec2-user 22 ~/.ssh/id_rsa.pub devproto-BastionHost
        StrictHostKeyChecking no

    Host debugInstance
        User ec2-user
        IdentityFile ~/.ssh/id_rsa
        ProxyCommand ~/.ssh/aws-ssm-ec2-proxy-command.sh hyperlocalAdmin ap-southeast-1 ec2-user 22 ~/.ssh/id_rsa.pub devproto-DebugInstance
        StrictHostKeyChecking no
    ```

1. Connect to the bastion host: `ssh bastion`

## Resources

* https://github.com/qoomon/aws-ssm-ec2-proxy-command

