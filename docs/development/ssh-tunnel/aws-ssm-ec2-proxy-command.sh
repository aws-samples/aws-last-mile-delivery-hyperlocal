#!/usr/bin/env sh
set -eu

REGION_SEPARATOR='--'

profile="$1"
region="$2"
ssh_user="$3"
ssh_port="$4"
ssh_public_key_path="$5"
instance_name="${6:0:19}"

CMD="aws ec2 describe-instances --profile $profile --region $region --query 'Reservations[].Instances[?Tags[?starts_with(Value, \`$instance_name\`) == \`true\`]][InstanceId]' --output text"
# >/dev/stderr echo $CMD
ec2_instance_id=$(eval $CMD)
# >/dev/stderr echo $ec2_instance_id
ssh_public_key="$(cat "${ssh_public_key_path}")"

if echo "${ec2_instance_id}" | grep -qe "${REGION_SEPARATOR}"
then
  export AWS_DEFAULT_REGION="${ec2_instance_id##*${REGION_SEPARATOR}}"
  ec2_instance_id="${ec2_instance_id%%${REGION_SEPARATOR}*}"
fi

>/dev/stderr echo "Add public key ${ssh_public_key_path} to instance ${ec2_instance_id} for 60 seconds"
aws ssm send-command \
  --instance-ids "${ec2_instance_id}" \
  --document-name 'AWS-RunShellScript' \
  --profile "$profile" \
  --comment "Add an SSH public key to authorized_keys for 60 seconds" \
  --parameters commands="\"
    mkdir -p ~${ssh_user}/.ssh
    cd ~${ssh_user}/.ssh || exit 1
    authorized_key='${ssh_public_key} ssm-session'
    echo \\\"\${authorized_key}\\\" >> authorized_keys
    sleep 60
    grep -v -F \\\"\${authorized_key}\\\" authorized_keys > .authorized_keys
    mv .authorized_keys authorized_keys
  \""

>/dev/stderr echo "Start ssm session to instance ${ec2_instance_id}"
aws ssm start-session \
  --target "${ec2_instance_id}" \
  --region "$region" \
  --document-name 'AWS-StartSSHSession' \
  --parameters "portNumber=${ssh_port}" \
  --profile "$profile"
