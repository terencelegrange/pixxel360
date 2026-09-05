pipeline {
    agent any

    environment {
        REMOTE_HOST = '192.168.100.228'
        REMOTE_USER = 'terence'
        DEPLOY_DIR  = '/home/pixxel360'
        APP_PORT    = '7002'
    }

    triggers {
        GenericTrigger(
            token: '5acaa0c3707540012717acbe92857194'
        )
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Write env file') {
            steps {
                withCredentials([
                    string(credentialsId: 'PIXXEL360_DATABASE_URL', variable: 'PIXXEL360_DATABASE_URL'),
                    string(credentialsId: 'PIXXEL360_JWT_SECRET', variable: 'PIXXEL360_JWT_SECRET'),
                    string(credentialsId: 'PIXXEL360_ADMIN_EMAIL', variable: 'PIXXEL360_ADMIN_EMAIL'),
                    string(credentialsId: 'PIXXEL360_ADMIN_PASSWORD_HASH', variable: 'PIXXEL360_ADMIN_PASSWORD_HASH'),
                ]) {
                    sh '''
                        cat > pixxel360.env <<EOF
DATABASE_URL=${PIXXEL360_DATABASE_URL}
JWT_SECRET=${PIXXEL360_JWT_SECRET}
ADMIN_EMAIL=${PIXXEL360_ADMIN_EMAIL}
ADMIN_PASSWORD_HASH=${PIXXEL360_ADMIN_PASSWORD_HASH}
EOF
                    '''
                    sshagent(credentials: ['PROXMOX_APPS_KEY']) {
                        sh """
                            ssh -o StrictHostKeyChecking=no ${REMOTE_USER}@${REMOTE_HOST} "mkdir -p ${DEPLOY_DIR}"
                            scp pixxel360.env ${REMOTE_USER}@${REMOTE_HOST}:${DEPLOY_DIR}/pixxel360.env
                        """
                    }
                }
            }
        }

        stage('Transfer Code') {
            steps {
                sshagent(credentials: ['PROXMOX_APPS_KEY']) {
                    sh """
                        rsync -az --delete \
                            --exclude='.git' \
                            --exclude='node_modules' \
                            --exclude='.next' \
                            --exclude='.env*' \
                            --exclude='pixxel360.env' \
                            ./ ${REMOTE_USER}@${REMOTE_HOST}:${DEPLOY_DIR}/
                    """
                }
            }
        }

        stage('Build & Deploy') {
            steps {
                sshagent(credentials: ['PROXMOX_APPS_KEY']) {
                    sh """
                        ssh ${REMOTE_USER}@${REMOTE_HOST} "
                            cd ${DEPLOY_DIR}
                            docker compose build
                            docker compose up -d
                        "
                    """
                }
            }
        }

        stage('Health Check') {
            steps {
                sshagent(credentials: ['PROXMOX_APPS_KEY']) {
                    sh """
                        ssh ${REMOTE_USER}@${REMOTE_HOST} 'bash -s' << 'REMOTE_SCRIPT'
                            attempt=0
                            until curl -sf http://localhost:${APP_PORT}/login > /dev/null 2>&1; do
                                attempt=\$((attempt+1))
                                if [ "\$attempt" -ge 18 ]; then
                                    echo 'Health check timed out after 90s'
                                    exit 1
                                fi
                                echo "Waiting for app... (\$attempt/18)"
                                sleep 5
                            done
                            echo 'App is healthy'
REMOTE_SCRIPT
                    """
                }
            }
        }
    }

    post {
        always {
            cleanWs()
        }
        success {
            echo "Deployed successfully to ${REMOTE_HOST}:${APP_PORT}"
        }
        failure {
            echo "Deploy failed -- check logs above"
        }
    }
}
